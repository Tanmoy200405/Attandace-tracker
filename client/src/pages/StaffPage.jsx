import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StaffModal } from '../components/StaffModal';
import { FaceScannerModal } from '../components/FaceScannerModal';
import { FingerprintModal } from '../components/FingerprintModal';
import { StaffDetailModal } from '../components/StaffDetailModal';
import {
  UserPlus,
  Search,
  Filter,
  ScanFace,
  Fingerprint,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const StaffPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [faceModalStaff, setFaceModalStaff] = useState(null);
  const [fpModalStaff, setFpModalStaff] = useState(null);
  const [detailStaffId, setDetailStaffId] = useState(null);

  const fetchStaff = async () => {
    try {
      const res = await api.staff.getAll({ search });
      if (res.success) {
        setStaffList(res.data);
      }
    } catch (err) {
      console.error('Error loading staff directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [search]);

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Are you sure you want to delete ${staff.name}? This will remove their biometric data and attendance records.`)) {
      return;
    }
    try {
      await api.staff.delete(staff._id);
      fetchStaff();
    } catch (err) {
      alert(`Error deleting staff: ${err.message}`);
    }
  };



  return (
    <div className="page-wrapper">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">
            Manage employees and configure one-time Facial and Fingerprint biometrics
          </p>
        </div>

        <button
          onClick={() => {
            setEditingStaff(null);
            setIsStaffModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <UserPlus size={18} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <Search
            size={16}
            color="var(--text-dim)"
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by name..."
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* (Department filters removed) */}

      </div>

      {/* Staff Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading staff directory...
        </div>
      ) : staffList.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No staff members found matching your filters.</p>
        </div>
      ) : (
        <div className="staff-cards-grid">
          {staffList.map((staff) => {
            const faceDone = staff.biometrics?.faceEnrolled;
            const fpDone = staff.biometrics?.fingerprintEnrolled;

            return (
              <div
                key={staff._id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                }}
              >
                {/* Staff Top Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: staff.avatarColor || '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        boxShadow: `0 4px 12px ${staff.avatarColor || '#4f46e5'}40`,
                        overflow: 'hidden',
                      }}
                    >
                      {faceDone && staff.biometrics?.facePhoto ? (
                        <img
                          src={staff.biometrics.facePhoto}
                          alt={staff.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        staff.name.charAt(0)
                      )}
                    </div>

                    <div>
                      <h3
                        onClick={() => setDetailStaffId(staff._id)}
                        style={{ fontSize: '1.05rem', margin: 0, color: '#1f2937', cursor: 'pointer' }}
                        title="View attendance history"
                      >
                        {staff.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span className="badge badge-unmarked" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                          {staff.employeeId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => {
                        setEditingStaff(staff);
                        setIsStaffModalOpen(true);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem', borderRadius: '8px' }}
                      title="Edit Staff"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(staff)}
                      className="btn btn-danger"
                      style={{ padding: '0.35rem', borderRadius: '8px' }}
                      title="Delete Staff"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Contact meta */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {staff.email && <div>Email: <span style={{ color: 'var(--text-muted)' }}>{staff.email}</span></div>}
                  {staff.phone && <div>Phone: <span style={{ color: 'var(--text-muted)' }}>{staff.phone}</span></div>}
                </div>

                {/* Biometrics Setup Box */}
                <div
                  style={{
                    background: '#f9fafb',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Biometric Enrollment Status
                  </div>

                  {/* Face Biometric Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <ScanFace size={15} color={faceDone ? '#34d399' : '#94a3b8'} />
                      <span>Camera Face:</span>
                      {faceDone ? (
                        <span className="badge badge-present" style={{ fontSize: '0.68rem' }}>Enrolled ✓</span>
                      ) : (
                        <span className="badge badge-unmarked" style={{ fontSize: '0.68rem' }}>Pending</span>
                      )}
                    </div>
                    <button
                      onClick={() => setFaceModalStaff(staff)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                    >
                      {faceDone ? 'Re-scan' : 'Scan Face'}
                    </button>
                  </div>

                  {/* Fingerprint Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <Fingerprint size={15} color={fpDone ? '#34d399' : '#94a3b8'} />
                      <span>Fingerprint:</span>
                      {fpDone ? (
                        <span className="badge badge-present" style={{ fontSize: '0.68rem' }}>Linked ✓</span>
                      ) : (
                        <span className="badge badge-unmarked" style={{ fontSize: '0.68rem' }}>Pending</span>
                      )}
                    </div>
                    <button
                      onClick={() => setFpModalStaff(staff)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
                    >
                      {fpDone ? 'Re-enroll' : 'Scan Finger'}
                    </button>
                  </div>
                </div>

                {/* Bottom Trigger: View History */}
                <button
                  onClick={() => setDetailStaffId(staff._id)}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem' }}
                >
                  <Calendar size={14} />
                  <span>View Attendance Profile</span>
                </button>

              </div>
            );
          })}
        </div>
      )}

      {/* Staff Create/Edit Modal */}
      {isStaffModalOpen && (
        <StaffModal
          staff={editingStaff}
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          onSuccess={fetchStaff}
        />
      )}

      {/* Face Scanner Modal */}
      {faceModalStaff && (
        <FaceScannerModal
          staff={faceModalStaff}
          isOpen={!!faceModalStaff}
          onClose={() => setFaceModalStaff(null)}
          onSuccess={fetchStaff}
        />
      )}

      {/* Fingerprint Modal */}
      {fpModalStaff && (
        <FingerprintModal
          staff={fpModalStaff}
          isOpen={!!fpModalStaff}
          onClose={() => setFpModalStaff(null)}
          onSuccess={fetchStaff}
        />
      )}

      {/* Staff Detail Modal */}
      {detailStaffId && (
        <StaffDetailModal
          staffId={detailStaffId}
          isOpen={!!detailStaffId}
          onClose={() => setDetailStaffId(null)}
        />
      )}

    </div>
  );
};
