import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Mail, Phone } from 'lucide-react';
import { api } from '../services/api';

export const StaffModal = ({ staff, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        weeklyOff: staff.weeklyOff || 'Sunday',
        monthlySalary: staff.monthlySalary || 30000,
        expectedCheckIn: staff.expectedCheckIn || '09:00 AM',
        expectedCheckOut: staff.expectedCheckOut || '05:00 PM',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        weeklyOff: 'Sunday',
        monthlySalary: 30000,
        expectedCheckIn: '09:00 AM',
        expectedCheckOut: '05:00 PM',
      });
    }
    setError(null);
  }, [staff, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Staff full name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (staff?._id) {
        await api.staff.update(staff._id, formData);
      } else {
        await api.staff.create(formData);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <UserPlus size={18} />
            </div>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{staff ? 'Edit Staff Profile' : 'Add New Staff Member'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="tel"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Profile & Shift Configuration */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase' }}>
                Payroll & Shift Options
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Monthly Base Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.monthlySalary}
                    onChange={(e) => setFormData({ ...formData, monthlySalary: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Weekly Day Off</label>
                  <select
                    className="form-select"
                    value={formData.weeklyOff}
                    onChange={(e) => setFormData({ ...formData, weeklyOff: e.target.value })}
                  >
                    {daysOfWeek.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Entry Shift Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM"
                    className="form-input"
                    value={formData.expectedCheckIn}
                    onChange={(e) => setFormData({ ...formData, expectedCheckIn: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Exit Shift Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 05:00 PM"
                    className="form-input"
                    value={formData.expectedCheckOut}
                    onChange={(e) => setFormData({ ...formData, expectedCheckOut: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} />
              <span>{loading ? 'Saving...' : staff ? 'Update Staff' : 'Create Staff'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

