import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, AlertCircle, ScanFace } from 'lucide-react';
import { captureFrameFromVideo, extractFaceDescriptor, playAudioChime, loadFaceModels } from '../utils/biometrics';
import { api } from '../services/api';

export const FaceScannerModal = ({ staff, isOpen, onClose, onSuccess }) => {
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhoto(null);
      return;
    }

    startCamera();
    loadFaceModels(); // Preload models when modal opens

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';

      if (!isLocal && !isHttps) {
        setCameraError('Mobile browsers block live webcam over insecure HTTP. Tap "Take Photo with Phone Camera" below or switch to HTTPS.');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Live camera not supported by this browser. Tap "Take Photo with Phone Camera" below.');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Webcam permission error:', err);
      setCameraError('Camera access not granted or unavailable on this device. You can take a photo directly with your phone camera.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const photo = captureFrameFromVideo(videoRef.current);
      if (photo) {
        setCapturedPhoto(photo);
      }
    }
  };

  const handleNativeCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const photo = event.target?.result;
      setCapturedPhoto(photo);
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleSaveEnrollment = async () => {
    if (!capturedPhoto || !staff) return;
    setLoading(true);
    try {
      // Load high-resolution captured photo directly into Image element
      const img = new Image();
      img.src = capturedPhoto;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      // Extract high-accuracy 128-d face descriptor directly from photo
      const descriptor = await extractFaceDescriptor(img);

      if (!descriptor) {
        alert('❌ No face detected in the captured photo! Please retake with your face clearly visible within the frame.');
        setLoading(false);
        return;
      }

      await api.staff.enrollFace(staff._id, capturedPhoto, descriptor);
      playAudioChime('success');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(`Failed to enroll face: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee' }}>
              <ScanFace size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Enroll Face Biometrics</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{staff?.name} ({staff?.employeeId})</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Camera Viewport */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px',
              aspectRatio: '4/3',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: '#000000',
              border: '1px solid var(--border-light)',
              boxShadow: '0 0 25px rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Hidden native camera input */}
            <input
              type="file"
              accept="image/*"
              capture="user"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleNativeCapture}
            />

            {cameraError ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={32} style={{ marginBottom: '0.5rem', color: '#ffffff' }} />
                <p style={{ fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '0.75rem' }}>{cameraError}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.55rem 0.85rem' }}
                  >
                    <Camera size={16} />
                    <span>Take Photo with Phone Camera</span>
                  </button>
                  <button onClick={startCamera} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.45rem' }}>
                    Retry Live Camera
                  </button>
                </div>
              </div>
            ) : capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured face snapshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />

                {/* Laser scan line animation */}
                <div className="laser-scanner" />

                {/* Responsive Oval face guide */}
                <div
                  style={{
                    position: 'absolute',
                    width: 'clamp(130px, 40vw, 180px)',
                    height: 'clamp(160px, 50vw, 220px)',
                    borderRadius: '50%',
                    border: '2px dashed rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 0 15px rgba(255, 255, 255, 0.2)',
                    pointerEvents: 'none',
                  }}
                />
              </>
            )}
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.85rem', textAlign: 'center' }}>
            {capturedPhoto
              ? 'Preview your face snapshot. If clear, click "Confirm & Enroll Face".'
              : 'Look straight into the camera and ensure good lighting within the oval frame.'}
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
            {capturedPhoto ? (
              <>
                <button onClick={handleRetake} className="btn btn-secondary" style={{ flex: '1 1 120px' }}>
                  <RefreshCw size={16} />
                  <span>Retake</span>
                </button>
                <button
                  onClick={handleSaveEnrollment}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: '1 1 180px' }}
                >
                  <Check size={16} />
                  <span>{loading ? 'Enrolling...' : 'Confirm & Enroll Face'}</span>
                </button>
              </>
            ) : stream ? (
              <button
                onClick={handleCapture}
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: '280px' }}
              >
                <Camera size={18} />
                <span>Capture Snapshot</span>
              </button>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: '280px' }}
              >
                <Camera size={18} />
                <span>Take Photo with Phone Camera</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
