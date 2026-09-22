import React, { useState } from 'react';
import { Fingerprint, X, Check, ShieldCheck, Cpu } from 'lucide-react';
import { enrollHardwareFingerprint, playAudioChime } from '../utils/biometrics';
import { api } from '../services/api';

export const FingerprintModal = ({ staff, isOpen, onClose, onSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentialData, setCredentialData] = useState(null);

  if (!isOpen) return null;

  const handleStartScan = async () => {
    setScanning(true);
    try {
      // Trigger WebAuthn / Sensor enrollment
      const result = await enrollHardwareFingerprint(staff?.name, staff?.employeeId);
      
      // Simulate physical sensor verification feedback
      setTimeout(() => {
        setScanning(false);
        setScanComplete(true);
        setCredentialData(result);
        playAudioChime('success');
      }, 1200);
    } catch (err) {
      setScanning(false);
      alert(`Fingerprint sensor error: ${err.message}`);
    }
  };

  const handleSaveEnrollment = async () => {
    if (!credentialData || !staff) return;
    setLoading(true);
    try {
      await api.staff.enrollFingerprint(staff._id, credentialData.credentialId);
      playAudioChime('success');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(`Failed to save fingerprint credential: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Fingerprint size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Enroll Fingerprint</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{staff?.name} ({staff?.employeeId})</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Sensor Body */}
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          
          <div
            onClick={!scanComplete ? handleStartScan : undefined}
            style={{
              position: 'relative',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: scanComplete
                ? 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(17, 24, 39, 0.9) 100%)'
                : scanning
                ? 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(17, 24, 39, 0.9) 100%)'
                : 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(17, 24, 39, 0.9) 100%)',
              border: `2px solid ${scanComplete ? '#10b981' : scanning ? '#22d3ee' : 'rgba(99, 102, 241, 0.4)'}`,
              boxShadow: scanComplete
                ? '0 0 35px rgba(16, 185, 129, 0.4)'
                : scanning
                ? '0 0 35px rgba(34, 211, 238, 0.5)'
                : '0 0 20px rgba(79, 70, 229, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: scanComplete ? 'default' : 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {scanning && (
              <div
                className="pulse-ring"
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  border: '2px solid #22d3ee',
                  pointerEvents: 'none',
                }}
              />
            )}

            {scanComplete ? (
              <Check size={56} color="#10b981" />
            ) : (
              <Fingerprint
                size={68}
                color={scanning ? '#22d3ee' : '#818cf8'}
                style={{
                  filter: scanning ? 'drop-shadow(0 0 8px #22d3ee)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
            )}
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ fontSize: '1rem', color: scanComplete ? '#34d399' : '#fff' }}>
              {scanComplete
                ? 'Fingerprint Captured Successfully!'
                : scanning
                ? 'Scanning biometric ridges...'
                : 'Place Finger on Sensor or Click Scanner'}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', maxWidth: '340px' }}>
              {scanComplete
                ? 'Biometric template generated. Click confirm to bind this credential to employee profile.'
                : 'Supports Windows Hello, Mac Touch ID, USB hardware sensor, or touch interface.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', padding: '0.4rem 0.75rem', background: '#1e293b', borderRadius: '9999px', fontSize: '0.72rem', color: '#94a3b8' }}>
            <Cpu size={13} color="#38bdf8" />
            <span>FIDO2 / WebAuthn Certified Biometric Key</span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', width: '100%' }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            {scanComplete ? (
              <button
                onClick={handleSaveEnrollment}
                disabled={loading}
                className="btn btn-success"
                style={{ flex: 1.2 }}
              >
                <Check size={16} />
                <span>{loading ? 'Binding...' : 'Confirm & Save'}</span>
              </button>
            ) : (
              <button
                onClick={handleStartScan}
                disabled={scanning}
                className="btn btn-primary"
                style={{ flex: 1.2 }}
              >
                <Fingerprint size={16} />
                <span>{scanning ? 'Reading...' : 'Scan Now'}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
