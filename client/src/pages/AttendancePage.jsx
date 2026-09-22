import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ManualAttendanceModal } from '../components/ManualAttendanceModal';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  CheckCheck,
  ScanFace,
  Fingerprint,
  Eye,
  X,
} from 'lucide-react';

export const AttendancePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('All');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewSnapshot, setPreviewSnapshot] = useState(null);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.attendance.getByDate(selectedDate, department);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error fetching daily attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, department]);

  const handleDateChange = (delta) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + delta);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleBulkMark = async (status) => {
    if (!window.confirm(`Mark all unmarked staff as ${status} for ${selectedDate}?`)) return;
    try {
      await api.attendance.bulkMark({ date: selectedDate, status, department });
      fetchAttendance();
    } catch (err) {
      alert(`Bulk mark error: ${err.message}`);
    }
  };

  const summary = data?.summary || {
    totalStaff: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    unmarked: 0,
    attendanceRate: 0,
  };

  const list = data?.data || [];
  const departments = ['All', 'Engineering', 'Sales', 'Marketing', 'Operations', 'Design', 'HR', 'Support', 'Finance'];

  return (
    <div className="page-wrapper">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Attendance Logs</h1>
          <p className="page-subtitle">
            Inspect check-in timestamps, face audit snapshots, and manual overrides
          </p>
        </div>

        {/* Date Selector Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => handleDateChange(-1)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ChevronLeft size={18} />
          </button>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <button onClick={() => handleDateChange(1)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ChevronRight size={18} />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Date Summary Banner */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{selectedDate}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Present</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>{summary.present}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Late</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>{summary.late}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Absent</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171' }}>{summary.absent}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{summary.attendanceRate}%</div>
          </div>
        </div>

        {/* Quick Bulk Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => handleBulkMark('Present')}
            className="btn btn-success"
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
          >
            <CheckCheck size={14} />
            <span>Mark Unmarked Present</span>
          </button>
          <button
            onClick={() => handleBulkMark('Absent')}
            className="btn btn-danger"
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
          >
            <span>Mark Unmarked Absent</span>
          </button>
        </div>
      </div>

      {/* Department Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
        <Filter size={15} color="var(--text-dim)" />
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => setDepartment(dept)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: department === dept ? 'var(--primary)' : 'var(--border)',
              background: department === dept ? 'rgba(79, 70, 229, 0.2)' : 'transparent',
              color: department === dept ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Attendance Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Department</th>
              <th>Status</th>
              <th>Clock-In</th>
              <th>Clock-Out</th>
              <th>Work Hours</th>
              <th>Verification & Audit Snapshot</th>
              <th>Remarks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading attendance records...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No staff records found for {selectedDate}.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.staff._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: row.staff.avatarColor || '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {row.staff.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{row.staff.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {row.staff.employeeId} • {row.staff.role}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {row.staff.department}
                  </td>

                  <td>
                    <span className={`badge badge-${row.status.toLowerCase().replace(' ', '')}`}>
                      {row.status}
                    </span>
                  </td>

                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                    {row.checkIn || '—'}
                  </td>

                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                    {row.checkOut || '—'}
                  </td>

                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                    {row.workHours ? `${row.workHours}h` : '—'}
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {row.verificationMethod === 'biometric_dual' ? (
                        <span className="badge badge-biometric" title="Face & Fingerprint Verified">
                          <ScanFace size={13} />
                          <Fingerprint size={13} />
                          <span>Dual Biometric</span>
                        </span>
                      ) : row.verificationMethod === 'manual_override' ? (
                        <span className="badge badge-unmarked">Manual Override</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>—</span>
                      )}

                      {/* Snapshot Thumbnail if present */}
                      {row.snapshotUrl && (
                        <button
                          onClick={() => setPreviewSnapshot({ url: row.snapshotUrl, name: row.staff.name, time: row.checkIn })}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                          title="View Face Verification Snapshot"
                        >
                          <Eye size={13} />
                          <span>Photo</span>
                        </button>
                      )}
                    </div>
                  </td>

                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.notes || '—'}
                  </td>

                  <td>
                    <button
                      onClick={() => setSelectedItem(row)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      Override
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Attendance Modal */}
      {selectedItem && (
        <ManualAttendanceModal
          item={selectedItem}
          date={selectedDate}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={fetchAttendance}
        />
      )}

      {/* Photo Snapshot Viewer Modal */}
      {previewSnapshot && (
        <div className="modal-overlay" onClick={() => setPreviewSnapshot(null)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Face Audit Snapshot</h3>
              <button onClick={() => setPreviewSnapshot(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '2px solid rgba(6, 182, 212, 0.4)', marginBottom: '0.75rem' }}>
              <img src={previewSnapshot.url} alt="Face snapshot" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Captured during check-in for <strong style={{ color: '#fff' }}>{previewSnapshot.name}</strong> at {previewSnapshot.time}.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
