import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, CheckCircle2, AlertTriangle, Fingerprint, ScanFace, Award } from 'lucide-react';
import { api } from '../services/api';

export const StaffDetailModal = ({ staffId, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !staffId) return;
    setLoading(true);
    const fetchDetails = async () => {
      try {
        const res = await api.staff.getById(staffId);
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Error fetching staff details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [isOpen, staffId]);

  if (!isOpen) return null;

  const staff = data?.staff;
  const stats = data?.stats;
  const history = data?.recentHistory || [];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: staff?.avatarColor || '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: 700,
                boxShadow: `0 4px 12px ${staff?.avatarColor || '#4f46e5'}40`,
              }}
            >
              {staff?.name ? staff.name.charAt(0) : 'S'}
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{staff?.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span className="badge badge-unmarked" style={{ fontSize: '0.7rem' }}>{staff?.employeeId}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{staff?.role} • {staff?.department}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff profile...</div>
          ) : (
            <>
              {/* Biometric Status Badges */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: 'rgba(31, 41, 55, 0.5)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <ScanFace size={16} color={staff?.biometrics?.faceEnrolled ? '#34d399' : '#94a3b8'} />
                  <span>Face Recognition:</span>
                  <span className={staff?.biometrics?.faceEnrolled ? 'badge badge-present' : 'badge badge-unmarked'}>
                    {staff?.biometrics?.faceEnrolled ? 'Enrolled ✓' : 'Not Enrolled'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <Fingerprint size={16} color={staff?.biometrics?.fingerprintEnrolled ? '#34d399' : '#94a3b8'} />
                  <span>Fingerprint Biometric:</span>
                  <span className={staff?.biometrics?.fingerprintEnrolled ? 'badge badge-present' : 'badge badge-unmarked'}>
                    {staff?.biometrics?.fingerprintEnrolled ? 'Linked ✓' : 'Not Linked'}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Present</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{stats?.presentCount || 0}</div>
                </div>
                <div className="glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Late</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>{stats?.lateCount || 0}</div>
                </div>
                <div className="glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Absent</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>{stats?.absentCount || 0}</div>
                </div>
                <div className="glass-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{stats?.attendanceRate || 0}%</div>
                </div>
              </div>

              {/* Recent Attendance Records */}
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#e2e8f0' }}>Recent Attendance History</h4>
              <div className="table-container" style={{ maxHeight: '240px' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No attendance records found yet.
                        </td>
                      </tr>
                    ) : (
                      history.map((h) => (
                        <tr key={h._id}>
                          <td style={{ fontWeight: 600 }}>{h.date}</td>
                          <td>
                            <span className={`badge badge-${h.status.toLowerCase().replace(' ', '')}`}>
                              {h.status}
                            </span>
                          </td>
                          <td>{h.checkIn || '-'}</td>
                          <td>{h.checkOut || '-'}</td>
                          <td>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {h.verificationMethod === 'biometric_dual' ? 'Dual Biometric' : h.verificationMethod || 'Manual'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
