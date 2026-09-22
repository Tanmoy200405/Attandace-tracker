import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ScanFace,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api';
import {
  captureFrameFromVideo,
  extractFaceDescriptor,
  compareFaceDescriptors,
  verifyHardwareFingerprint,
  playAudioChime,
  loadFaceModels,
} from '../utils/biometrics';

export const KioskPage = ({ onClose }) => {
  const [enrolledStaff, setEnrolledStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [actionType, setActionType] = useState('check-in'); // 'check-in' or 'check-out'

  // Verification state machine
  // 'idle' -> 'face_detected' -> 'fingerprint_pending' -> 'verified'
  const [step, setStep] = useState('idle');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [faceScore, setFaceScore] = useState(null);
  const [snapshotPhoto, setSnapshotPhoto] = useState(null);
  const [fpScanning, setFpScanning] = useState(false);
  const [fpVerified, setFpVerified] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch enrolled staff list & preload models
  useEffect(() => {
    const fetchEnrolled = async () => {
      try {
        const res = await api.staff.getKioskEnrolled();
        if (res.success) {
          setEnrolledStaff(res.data);
          if (res.data.length > 0) {
            setSelectedStaff(res.data[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching enrolled staff for kiosk:', err);
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchEnrolled();
    loadFaceModels(); // Preload face-api models
  }, []);

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';

      if (!isLocal && !isHttps) {
        setCameraError(
          'Mobile browsers require HTTPS to stream live camera. Open with https:// or tap "Capture with Phone Camera" below.'
        );
        setCameraActive(false);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Live camera stream not supported by this browser. Tap "Capture with Phone Camera" below.');
        setCameraActive(false);
        return;
      }

      // Attempt standard video constraints first, fallback if specific facingMode/dimensions fail
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setCameraActive(true);

      // Attach stream to video element once state updates DOM
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.log('Video play error:', e));
        }
      }, 50);
    } catch (err) {
      console.warn('Kiosk camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied by browser. Please grant camera permission in site settings or tap "Capture with Phone Camera".');
      } else {
        setCameraError(`Camera error (${err.name || 'Unavailable'}). Tap "Activate Live Stream" or "Capture with Phone Camera".`);
      }
      setCameraActive(false);
    }
  };

  const handleNativeCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedStaff) {
      setVerificationError('Please select a staff member profile first.');
      return;
    }

    if (!selectedStaff.biometrics?.faceEnrolled || !selectedStaff.biometrics?.faceDescriptor?.length) {
      setVerificationError(`Staff member "${selectedStaff.name}" has not enrolled their face biometrics. Please enroll first in Staff Management.`);
      playAudioChime('warning');
      return;
    }

    setVerificationError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const photo = event.target?.result;
      setSnapshotPhoto(photo);

      // Extract face descriptor from captured image
      const img = new Image();
      img.src = photo;
      await new Promise((res) => (img.onload = res));

      const liveDesc = await extractFaceDescriptor(img);
      if (!liveDesc) {
        setVerificationError('❌ No face detected in photo! Please take a clear photo facing the camera.');
        setFaceScore(null);
        setStep('face_mismatch');
        playAudioChime('warning');
        return;
      }

      const matchResult = compareFaceDescriptors(liveDesc, selectedStaff.biometrics.faceDescriptor);
      setFaceScore(matchResult.score);

      if (!matchResult.isMatch) {
        setVerificationError(
          `❌ Face Mismatch! Similarity score is only ${matchResult.score}%. This face does NOT match ${selectedStaff.name}'s enrolled biometrics. Attendance denied.`
        );
        setStep('face_mismatch');
        playAudioChime('warning');
        return;
      }

      // Success: Face matches!
      setVerificationError(null);
      setStep('fingerprint_pending');
      playAudioChime('success');
    };
    reader.readAsDataURL(file);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Face Scan Trigger
  const handleScanFace = async () => {
    if (!selectedStaff) {
      setVerificationError('Please select a staff member first.');
      return;
    }

    if (!selectedStaff.biometrics?.faceEnrolled || !selectedStaff.biometrics?.faceDescriptor?.length) {
      setVerificationError(`Staff member "${selectedStaff.name}" has not enrolled their face biometrics yet. Please enroll first in Staff Management.`);
      playAudioChime('warning');
      return;
    }

    setVerificationError(null);

    let photo = null;
    let liveDescriptor = null;

    if (videoRef.current && cameraActive) {
      photo = captureFrameFromVideo(videoRef.current);
      if (!photo) {
        setVerificationError('Failed to capture video frame. Please ensure camera is active.');
        playAudioChime('warning');
        return;
      }
      setSnapshotPhoto(photo);
      liveDescriptor = await extractFaceDescriptor(videoRef.current);
    } else if (snapshotPhoto) {
      const img = new Image();
      img.src = snapshotPhoto;
      await new Promise((res) => (img.onload = res));
      liveDescriptor = await extractFaceDescriptor(img);
    } else {
      // Prompt user to open camera or take photo
      fileInputRef.current?.click();
      return;
    }

    if (!liveDescriptor) {
      setVerificationError('❌ No face detected! Please look directly into the camera inside the guide oval.');
      setFaceScore(null);
      setStep('face_mismatch');
      playAudioChime('warning');
      return;
    }

    // Compare with enrolled descriptor using strict Euclidean threshold
    const matchResult = compareFaceDescriptors(liveDescriptor, selectedStaff.biometrics.faceDescriptor);
    setFaceScore(matchResult.score);

    if (!matchResult.isMatch) {
      // DIFFERENT PERSON OR WRONG STAFF
      setVerificationError(
        `❌ Face Mismatch! Similarity is ${matchResult.score}%. The detected face does not match ${selectedStaff.name}'s biometric profile. Attendance denied.`
      );
      setStep('face_mismatch');
      playAudioChime('warning');
      return;
    }

    // Face verified!
    setVerificationError(null);
    setStep('fingerprint_pending');
    playAudioChime('success');
  };

  // Fingerprint Scan Trigger
  const handleScanFingerprint = async () => {
    if (!selectedStaff) return;

    if (step !== 'fingerprint_pending') {
      setVerificationError('Please complete Face Recognition first.');
      playAudioChime('warning');
      return;
    }

    if (!selectedStaff.biometrics?.fingerprintEnrolled || !selectedStaff.biometrics?.fingerprintCredentialId) {
      setVerificationError(`Staff member "${selectedStaff.name}" has not enrolled their fingerprint biometric key.`);
      playAudioChime('warning');
      return;
    }

    setFpScanning(true);
    setVerificationError(null);

    try {
      // Call WebAuthn / Sensor verification
      const res = await verifyHardwareFingerprint(selectedStaff.biometrics?.fingerprintCredentialId);
      
      if (!res || !res.verified) {
        setFpScanning(false);
        setVerificationError(`❌ ${res?.message || 'Fingerprint verification failed or cancelled. Attendance not recorded.'}`);
        playAudioChime('warning');
        return;
      }

      setFpScanning(false);
      setFpVerified(true);
      setStep('verified');

      // Submit to API
      try {
        const apiRes = await api.attendance.biometricVerify({
          staffId: selectedStaff._id,
          faceScore: faceScore || 85,
          fingerprintVerified: true,
          snapshotUrl: snapshotPhoto || '',
          action: actionType,
        });

        setVerificationResult(apiRes);
        setVerificationError(null);
        playAudioChime('success');

        // Celebrate with confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        // Auto-reset after 4.5 seconds for next employee
        setTimeout(() => {
          resetKiosk();
        }, 4500);

      } catch (apiErr) {
        setVerificationError(`Attendance recording error: ${apiErr.message}`);
        playAudioChime('warning');
      }

    } catch (err) {
      setFpScanning(false);
      setVerificationError(`Fingerprint verification error: ${err.message}`);
      playAudioChime('warning');
    }
  };

  const resetKiosk = () => {
    setStep('idle');
    setFpScanning(false);
    setFpVerified(false);
    setFaceScore(null);
    setSnapshotPhoto(null);
    setVerificationResult(null);
    setVerificationError(null);
  };

  return (
    <div className="page-wrapper kiosk-container">
      
      {/* Kiosk Header */}
      <div
        className="glass-card kiosk-header"
        style={{
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#222222',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <ShieldCheck size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#fff' }}>Biometric Attendance Kiosk</h2>
              <span className="badge badge-biometric">Live Verification Mode</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
              Dual Authentication: Facial Biometrics + Fingerprint Hardware Sensor
            </p>
          </div>
        </div>

        {/* Check-In vs Check-Out Toggle */}
        <div className="kiosk-toggle-group">
          <button
            onClick={() => setActionType('check-in')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: actionType === 'check-in' ? '#ffffff' : 'transparent',
              color: actionType === 'check-in' ? '#000000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>Clock In (Arrival)</span>
          </button>
          <button
            onClick={() => setActionType('check-out')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: actionType === 'check-out' ? '#ffffff' : 'transparent',
              color: actionType === 'check-out' ? '#000000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>Clock Out (Departure)</span>
          </button>
        </div>
      </div>

      {/* Biometric Mismatch / Error Banner */}
      {verificationError && (
        <div
          className="glass-card"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            border: '1px solid #ffffff',
            background: 'rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} color="#ffffff" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                Biometric Verification Rejected
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {verificationError}
              </div>
            </div>
          </div>
          <button
            onClick={() => setVerificationError(null)}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Dual Verification Arena */}
      <div className="kiosk-grid">
        
        {/* Left Column: Live Camera & Face Recognition */}
        <div className="glass-card kiosk-card">
          
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ScanFace size={20} color="#ffffff" />
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Step 1: Face Recognition</h3>
            </div>
            {cameraActive && (
              <span className="badge badge-present" style={{ fontSize: '0.7rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                Camera Stream Active
              </span>
            )}
          </div>

          {/* Camera Box */}
          <div className="kiosk-camera-container">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />

                {/* Laser scan animation */}
                <div className="laser-scanner" />

                {/* Responsive Oval face guide */}
                <div className="kiosk-face-oval" />
              </>
            ) : snapshotPhoto ? (
              <>
                <img
                  src={snapshotPhoto}
                  alt="Captured face snapshot"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="laser-scanner" />
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
                <Camera size={40} color="#888888" style={{ marginBottom: '0.75rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '1rem' }}>
                  {cameraError || 'Live camera stream not active. Use your phone camera or activate live webcam.'}
                </p>

                {/* Hidden native camera file input */}
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleNativeCapture}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.65rem 1rem', width: '100%' }}
                  >
                    <Camera size={16} />
                    <span>Capture with Phone Camera</span>
                  </button>

                  <button
                    onClick={startCamera}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.55rem 1rem', width: '100%' }}
                  >
                    <span>Activate Live Stream</span>
                  </button>

                  {typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                    <button
                      onClick={() => {
                        window.location.href = window.location.href.replace('http:', 'https:');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderColor: '#ffffff', color: '#ffffff' }}
                    >
                      <span>🔒 Switch to HTTPS for Live Video</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Target Face Overlay */}
            {faceScore !== null && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '0.75rem',
                  left: '0.75rem',
                  right: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(10px)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${step === 'face_mismatch' ? '#888888' : '#ffffff'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {step === 'face_mismatch' ? (
                    <AlertTriangle size={18} color="#888888" />
                  ) : (
                    <CheckCircle2 size={18} color="#ffffff" />
                  )}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                    {step === 'face_mismatch' ? 'Mismatch' : selectedStaff?.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: step === 'face_mismatch' ? '#aaaaaa' : '#ffffff',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                  }}
                >
                  {faceScore}% {step === 'face_mismatch' ? '(DENIED)' : 'Match'}
                </span>
              </div>
            )}
          </div>

          {/* Face Scan Trigger Button */}
          <div style={{ width: '100%', maxWidth: '480px', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              onClick={cameraActive ? handleScanFace : snapshotPhoto ? handleScanFace : () => fileInputRef.current?.click()}
              disabled={!selectedStaff || step === 'verified'}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.875rem' }}
            >
              <ScanFace size={20} />
              <span>
                {cameraActive
                  ? (step === 'idle' ? '1. Scan Face & Recognize Staff' : 'Re-scan Face')
                  : snapshotPhoto
                  ? 'Verify Face from Captured Photo'
                  : '1. Tap to Take Photo with Phone Camera'}
              </span>
            </button>

            {!cameraActive && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.65rem', fontSize: '0.82rem' }}
              >
                <Camera size={16} />
                <span>{snapshotPhoto ? 'Retake Photo with Phone Camera' : 'Open Phone Camera'}</span>
              </button>
            )}
          </div>

        </div>

        {/* Right Column: Fingerprint Verification & Final Approval */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          
          {/* Staff Selector */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserCheck size={16} color="#cccccc" />
              <span>Staff Profile in Camera Frame</span>
            </label>
            <select
              className="form-select"
              value={selectedStaff?._id || ''}
              onChange={(e) => {
                const s = enrolledStaff.find((item) => item._id === e.target.value);
                setSelectedStaff(s);
                resetKiosk();
              }}
              style={{ fontWeight: 600 }}
            >
              {enrolledStaff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.employeeId} - {s.department})
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
              Auto-selected from enrolled biometric profiles.
            </p>
          </div>

          {/* Step 2: Fingerprint Sensor */}
          <div
            className="glass-card kiosk-card"
            style={{
              padding: '1.5rem',
              border: step === 'fingerprint_pending' ? '2px solid #ffffff' : '1px solid var(--border)',
            }}
          >
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Fingerprint size={20} color="#ffffff" />
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Step 2: Fingerprint Sensor</h3>
            </div>

            {/* Glowing Sensor Pad */}
            <div
              onClick={step === 'fingerprint_pending' ? handleScanFingerprint : undefined}
              className="sensor-pad"
              style={{
                background: fpVerified
                  ? 'radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, rgba(20, 20, 20, 0.95) 100%)'
                  : fpScanning
                  ? 'radial-gradient(circle, rgba(200, 200, 200, 0.3) 0%, rgba(20, 20, 20, 0.95) 100%)'
                  : step === 'fingerprint_pending'
                  ? 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(20, 20, 20, 0.95) 100%)'
                  : 'rgba(25, 25, 25, 0.5)',
                border: `2px solid ${fpVerified ? '#ffffff' : fpScanning ? '#cccccc' : step === 'fingerprint_pending' ? '#ffffff' : 'var(--border)'}`,
                boxShadow: fpVerified || fpScanning || step === 'fingerprint_pending'
                  ? '0 0 25px rgba(255, 255, 255, 0.2)'
                  : 'none',
                cursor: step === 'fingerprint_pending' ? 'pointer' : 'default',
              }}
            >
              {fpScanning && (
                <div
                  className="pulse-ring"
                  style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                  }}
                />
              )}

              {fpVerified ? (
                <CheckCircle2 size={52} color="#ffffff" />
              ) : (
                <Fingerprint
                  size={58}
                  color={fpScanning ? '#ffffff' : step === 'fingerprint_pending' ? '#ffffff' : '#666666'}
                />
              )}
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <h4 style={{ fontSize: '0.95rem', color: fpVerified ? '#ffffff' : step === 'fingerprint_pending' ? '#fff' : 'var(--text-muted)' }}>
                {fpVerified
                  ? 'Fingerprint Verified ✓'
                  : fpScanning
                  ? 'Verifying biometric token...'
                  : step === 'fingerprint_pending'
                  ? 'Touch Sensor to Complete Check-In'
                  : 'Waiting for Face Recognition First'}
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Hardware biometric reader (Windows Hello / Touch ID / Touchscreen)
              </p>
            </div>

            <button
              onClick={handleScanFingerprint}
              disabled={step !== 'fingerprint_pending' || fpScanning || fpVerified}
              className="btn btn-primary"
              style={{ marginTop: '1.25rem', width: '100%', padding: '0.75rem' }}
            >
              <Fingerprint size={18} />
              <span>{fpScanning ? 'Verifying...' : '2. Scan Fingerprint Now'}</span>
            </button>
          </div>

          {/* Success Result Card */}
          {verificationResult && (
            <div
              className="glass-card"
              style={{
                padding: '1.25rem',
                border: '1px solid #ffffff',
                background: 'rgba(255, 255, 255, 0.08)',
                animation: 'slideUp 0.3s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: '#fff', margin: 0 }}>
                    Attendance Recorded!
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#cccccc', margin: '0.2rem 0 0' }}>
                    {verificationResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
