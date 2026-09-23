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
  SwitchCamera,
  Award,
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
  const [verifyMode, setVerifyMode] = useState('face_only'); // 'face_only', 'fingerprint_only', 'biometric_dual'
  const [todayStaffRecord, setTodayStaffRecord] = useState(null);

  // Auto-detect if selectedStaff already clocked in today, auto-switch action to 'check-out'
  useEffect(() => {
    if (!selectedStaff) return;
    const checkTodayStatus = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await api.attendance.getByDate(todayStr);
        if (res.success && res.data) {
          const item = res.data.find((row) => row.staff._id === selectedStaff._id);
          if (item) {
            setTodayStaffRecord(item);
            if (item.checkIn && !item.checkOut) {
              setActionType('check-out');
            } else {
              setActionType('check-in');
            }
          } else {
            setTodayStaffRecord(null);
            setActionType('check-in');
          }
        }
      } catch (err) {
        console.warn('Error checking today staff attendance status:', err);
      }
    };
    checkTodayStatus();
  }, [selectedStaff]);

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
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)

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

  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    stopCamera();
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

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setCameraActive(true);

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

  const flipCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
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
      if (verifyMode === 'face_only') {
        // Single Verification Mode (Face Only): Submit immediately!
        submitVerification({
          method: 'face_only',
          score: matchResult.score,
          photo,
        });
      } else {
        setVerificationError(null);
        setStep('fingerprint_pending');
        playAudioChime('success');
      }
    };
    reader.readAsDataURL(file);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Central submission helper
  const submitVerification = async ({ method, score, photo, fpVerifiedFlag = false }) => {
    try {
      setStep('verified');
      const apiRes = await api.attendance.biometricVerify({
        staffId: selectedStaff._id,
        faceScore: score || null,
        fingerprintVerified: method === 'face_only' ? true : fpVerifiedFlag,
        snapshotUrl: photo || snapshotPhoto || selectedStaff?.biometrics?.facePhoto || '',
        action: actionType,
        verificationMethod: method,
      });

      setVerificationResult(apiRes);
      setVerificationError(null);

      if (apiRes.isLate) {
        playAudioChime('warning');
      } else {
        playAudioChime('success');
      }

      confetti({
        particleCount: apiRes.isLate ? 30 : 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      const autoResetTime = apiRes.isLate ? 7000 : apiRes.isOvertime ? 6000 : 4500;
      setTimeout(() => {
        resetKiosk();
      }, autoResetTime);
    } catch (apiErr) {
      setVerificationError(`Attendance recording error: ${apiErr.message}`);
      playAudioChime('warning');
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

    const matchResult = compareFaceDescriptors(liveDescriptor, selectedStaff.biometrics.faceDescriptor);
    setFaceScore(matchResult.score);

    if (!matchResult.isMatch) {
      setVerificationError(
        `❌ Face Mismatch! Similarity is ${matchResult.score}%. The detected face does not match ${selectedStaff.name}'s biometric profile. Attendance denied.`
      );
      setStep('face_mismatch');
      playAudioChime('warning');
      return;
    }

    // Face verified!
    if (verifyMode === 'face_only') {
      submitVerification({
        method: 'face_only',
        score: matchResult.score,
        photo,
      });
    } else {
      setVerificationError(null);
      setStep('fingerprint_pending');
      playAudioChime('success');
    }
  };

  // Fingerprint Scan Trigger
  const handleScanFingerprint = async () => {
    if (!selectedStaff) return;

    if (verifyMode === 'biometric_dual' && step !== 'fingerprint_pending') {
      setVerificationError('Please complete Face Recognition first for Dual Verification.');
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
      const res = await verifyHardwareFingerprint(selectedStaff.biometrics?.fingerprintCredentialId);
      
      if (!res || !res.verified) {
        setFpScanning(false);
        setVerificationError(`❌ ${res?.message || 'Fingerprint verification failed or cancelled. Attendance not recorded.'}`);
        playAudioChime('warning');
        return;
      }

      setFpScanning(false);
      setFpVerified(true);

      const method = verifyMode === 'fingerprint_only' ? 'fingerprint_only' : 'biometric_dual';
      submitVerification({
        method,
        score: faceScore || null,
        photo: snapshotPhoto,
        fpVerifiedFlag: true,
      });

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
      {/* Biometric Mode Selection Tabs */}
      <div
        className="glass-card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={20} color="#38bdf8" />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Verification Method Choice</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Choose single biometric (Camera or Fingerprint) or Dual Verification for attendance
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setVerifyMode('face_only');
              resetKiosk();
            }}
            className={`btn ${verifyMode === 'face_only' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: verifyMode === 'face_only' ? '#06b6d4' : undefined,
              borderColor: verifyMode === 'face_only' ? '#06b6d4' : undefined,
              color: verifyMode === 'face_only' ? '#ffffff' : undefined,
            }}
          >
            <ScanFace size={16} />
            <span>📷 Camera (Face Only)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVerifyMode('fingerprint_only');
              resetKiosk();
            }}
            className={`btn ${verifyMode === 'fingerprint_only' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: verifyMode === 'fingerprint_only' ? '#a855f7' : undefined,
              borderColor: verifyMode === 'fingerprint_only' ? '#a855f7' : undefined,
              color: verifyMode === 'fingerprint_only' ? '#ffffff' : undefined,
            }}
          >
            <Fingerprint size={16} />
            <span>👆 Fingerprint Sensor Only</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVerifyMode('biometric_dual');
              resetKiosk();
            }}
            className={`btn ${verifyMode === 'biometric_dual' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: verifyMode === 'biometric_dual' ? '#10b981' : undefined,
              borderColor: verifyMode === 'biometric_dual' ? '#10b981' : undefined,
              color: verifyMode === 'biometric_dual' ? '#ffffff' : undefined,
            }}
          >
            <ShieldCheck size={16} />
            <span>🔒 Dual (Face + Fingerprint)</span>
          </button>
        </div>
      </div>

      {/* Main Dual Verification Arena */}
      <div className="kiosk-grid">
        
        {/* Left Column: Live Camera & Face Recognition */}
        <div className="glass-card kiosk-card">
          
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ScanFace size={20} color={verifyMode === 'fingerprint_only' ? '#666666' : '#ffffff'} />
              <h3 style={{ fontSize: '1.05rem', margin: 0, color: verifyMode === 'fingerprint_only' ? 'var(--text-dim)' : '#ffffff' }}>
                {verifyMode === 'face_only'
                  ? 'Face Recognition Attendance'
                  : verifyMode === 'biometric_dual'
                  ? 'Step 1: Face Recognition'
                  : 'Camera Stream (Fingerprint Mode Active)'}
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {cameraActive && (
                <button
                  onClick={flipCamera}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Switch between front and back camera"
                >
                  <SwitchCamera size={14} />
                  <span>Flip Camera</span>
                </button>
              )}
              {cameraActive && (
                <span className="badge badge-present" style={{ fontSize: '0.7rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                  Active ({facingMode === 'user' ? 'Front' : 'Back'})
                </span>
              )}
            </div>
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
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  }}
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

            {/* Live Today Status Mini-Card */}
            {selectedStaff && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Clock size={15} color="#38bdf8" />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Today's Status:</span>
                </div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: todayStaffRecord?.checkIn
                      ? todayStaffRecord.checkOut
                        ? '#38bdf8'
                        : '#34d399'
                      : '#f87171',
                  }}
                >
                  {todayStaffRecord?.checkIn
                    ? todayStaffRecord.checkOut
                      ? `Clocked Out (${todayStaffRecord.checkOut})`
                      : `Clocked In (${todayStaffRecord.checkIn})`
                    : 'Not Clocked In Yet'}
                </span>
              </div>
            )}
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

        </div>

      </div>

      {/* Verification Result Modal Pop-Up Overlay */}
      {verificationResult && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              borderRadius: '24px',
              border: verificationResult.isLate
                ? '2px solid #ef4444'
                : verificationResult.isOvertime
                ? '2px solid #a855f7'
                : '2px solid #10b981',
              boxShadow: verificationResult.isLate
                ? '0 0 45px rgba(239, 68, 68, 0.4)'
                : verificationResult.isOvertime
                ? '0 0 45px rgba(168, 85, 247, 0.4)'
                : '0 0 45px rgba(16, 185, 129, 0.4)',
              animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              textAlign: 'center',
              background: 'rgba(18, 18, 20, 0.95)',
            }}
          >
            {/* Top Icon Badge */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                margin: '0 auto 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: verificationResult.isLate
                  ? 'rgba(239, 68, 68, 0.15)'
                  : verificationResult.isOvertime
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
                border: `2px solid ${
                  verificationResult.isLate
                    ? '#ef4444'
                    : verificationResult.isOvertime
                    ? '#a855f7'
                    : '#10b981'
                }`,
              }}
            >
              {verificationResult.isLate ? (
                <AlertTriangle size={42} color="#ef4444" />
              ) : verificationResult.isOvertime ? (
                <Award size={42} color="#a855f7" />
              ) : (
                <CheckCircle2 size={42} color="#10b981" />
              )}
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                margin: '0 0 0.35rem',
                color: verificationResult.isLate
                  ? '#f87171'
                  : verificationResult.isOvertime
                  ? '#c084fc'
                  : '#34d399',
              }}
            >
              {verificationResult.isLate
                ? 'YOU ARE LATE!'
                : verificationResult.isOvertime
                ? 'OVERTIME LOGGED!'
                : 'PUNCTUAL CHECK-IN!'}
            </h2>

            {/* Staff Name & ID */}
            <p style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 600, margin: '0 0 1.25rem' }}>
              {selectedStaff?.name} ({selectedStaff?.employeeId})
            </p>

            {/* Shift Breakdown Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.25rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {verificationResult.action === 'check-in' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Admin Shift Start:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                      {verificationResult.shiftStart || '09:00 AM'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Actual Clock-In:</span>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: verificationResult.isLate ? '#f87171' : '#34d399',
                      }}
                    >
                      {verificationResult.checkIn || verificationResult.checkInTime}
                    </span>
                  </div>
                  {verificationResult.isLate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Late Duration:</span>
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid #f87171',
                          color: '#fca5a5',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                        }}
                      >
                        ⏱️ {verificationResult.lateMinutes} Mins Late
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Admin Shift End:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                      {verificationResult.shiftEnd || '05:00 PM'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Actual Clock-Out:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                      {verificationResult.checkOut || verificationResult.checkOutTime}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Work Hours:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>
                      {verificationResult.workHours} hrs
                    </span>
                  </div>
                  {verificationResult.isOvertime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Overtime Credited:</span>
                      <span
                        style={{
                          background: 'rgba(168, 85, 247, 0.25)',
                          border: '1px solid #c084fc',
                          color: '#e9d5ff',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                        }}
                      >
                        ⭐ {verificationResult.overtimeHours} hrs Overtime
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Payroll Notice Box */}
            {verificationResult.isLate && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px dashed rgba(239, 68, 68, 0.4)',
                  borderRadius: '12px',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                  lineHeight: 1.45,
                }}
              >
                <strong>⚠️ Payroll Policy Warning:</strong> Marked as LATE in attendance. Note that 3 late days result in 1 day salary deduction in monthly payroll.
              </div>
            )}

            {verificationResult.isOvertime && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1px dashed rgba(168, 85, 247, 0.4)',
                  borderRadius: '12px',
                  color: '#e9d5ff',
                  fontSize: '0.8rem',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                  lineHeight: 1.45,
                }}
              >
                <strong>⭐ Overtime Bonus Note:</strong> Extra hours recorded for monthly payroll overtime bonus calculations.
              </div>
            )}

            <button
              onClick={resetKiosk}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '12px',
                background: verificationResult.isLate
                  ? '#ef4444'
                  : verificationResult.isOvertime
                  ? '#9333ea'
                  : 'var(--primary)',
                borderColor: verificationResult.isLate
                  ? '#ef4444'
                  : verificationResult.isOvertime
                  ? '#9333ea'
                  : 'var(--primary)',
              }}
            >
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
