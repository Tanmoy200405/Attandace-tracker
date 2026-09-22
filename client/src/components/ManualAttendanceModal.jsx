import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Calendar } from 'lucide-react';
import { api } from '../services/api';

export const ManualAttendanceModal = ({ item, date, isOpen, onClose, onSuccess }) => {
  const [status, setStatus] = useState('Present');
  const [checkIn, setCheckIn] = useState('09:00 AM');
  const [checkOut, setCheckOut] = useState('05:00 PM');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setStatus(item.status !== 'Unmarked' ? item.status : 'Present');
      setCheckIn(item.checkIn || '09:00 AM');
      setCheckOut(item.checkOut || '05:00 PM');
      setNotes(item.notes || '');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.attendance.manualMark({
        staffId: item.staff._id,
        date: date,
        status: status,
        checkIn: status === 'Absent' || status === 'Leave' ? null : checkIn,
        checkOut: status === 'Absent' || status === 'Leave' ? null : checkOut,
        notes: notes,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(`Error updating attendance: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const statuses = ['Present', 'Late', 'Half Day', 'Absent', 'Leave'];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Attendance Override</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
              {item.staff.name} • {date}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          
          <div className="form-group">
            <label className="form-label">Attendance Status</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {statuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`badge badge-${s.toLowerCase().replace(' ', '')}`}
                  style={{
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    opacity: status === s ? 1 : 0.45,
                    borderWidth: status === s ? '2px' : '1px',
                    transform: status === s ? 'scale(1.05)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {(status === 'Present' || status === 'Late' || status === 'Half Day') && (
            <div className="grid-2-col" style={{ marginTop: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Check-In Time</label>
                <input
                  type="text"
                  placeholder="09:00 AM"
                  className="form-input"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Check-Out Time</label>
                <input
                  type="text"
                  placeholder="05:00 PM"
                  className="form-input"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label className="form-label">Reason / Remarks (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Doctor appointment, client site visit, etc."
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Attendance'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
