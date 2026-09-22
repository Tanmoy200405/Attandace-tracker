import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Save, Clock, Building, ShieldCheck, Check } from 'lucide-react';

export const SettingsPage = () => {
  const { owner, updateBusinessSettings } = useAuth();

  const [formData, setFormData] = useState({
    businessName: '',
    shiftStart: '09:00',
    shiftEnd: '17:00',
    gracePeriodMinutes: 15,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (owner) {
      setFormData({
        businessName: owner.businessName || '',
        shiftStart: owner.shiftStart || '09:00',
        shiftEnd: owner.shiftEnd || '17:00',
        gracePeriodMinutes: owner.gracePeriodMinutes ?? 15,
        workingDays: owner.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      });
    }
  }, [owner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await updateBusinessSettings(formData);
      setSuccessMsg('Business settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert(`Error updating settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day) => {
    if (formData.workingDays.includes(day)) {
      setFormData({
        ...formData,
        workingDays: formData.workingDays.filter((d) => d !== day),
      });
    } else {
      setFormData({
        ...formData,
        workingDays: [...formData.workingDays, day],
      });
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '840px' }}>
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Shift & Business Settings</h1>
          <p className="page-subtitle">
            Configure default working hours, grace periods for punctuality, and business profile
          </p>
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#34d399',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem' }}>
        
        {/* Business Details */}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building size={18} color="#818cf8" />
          <span>Business Identity</span>
        </h3>

        <div className="form-group">
          <label className="form-label">Business / Company Name</label>
          <input
            type="text"
            required
            className="form-input"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            placeholder="e.g. Apex Corporation"
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.75rem 0' }} />

        {/* Shift Timings & Grace Period */}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="#06b6d4" />
          <span>Default Shift Schedule & Punctuality</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Shift Start Time</label>
            <input
              type="time"
              required
              className="form-input"
              value={formData.shiftStart}
              onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.35rem', display: 'block' }}>
              Staff arriving after this time (+ grace period) will be automatically flagged as "Late".
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Shift End Time</label>
            <input
              type="time"
              required
              className="form-input"
              value={formData.shiftEnd}
              onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.35rem', display: 'block' }}>
              Standard closing time for working hours calculation.
            </span>
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: '340px' }}>
          <label className="form-label">Late Arrival Grace Period (Minutes)</label>
          <input
            type="number"
            min={0}
            max={60}
            required
            className="form-input"
            value={formData.gracePeriodMinutes}
            onChange={(e) => setFormData({ ...formData, gracePeriodMinutes: e.target.value })}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.35rem', display: 'block' }}>
            Allow staff up to this many minutes after shift start before marking "Late".
          </span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.75rem 0' }} />

        {/* Working Days */}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff' }}>
          Official Working Days
        </h3>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {daysOfWeek.map((day) => {
            const isSelected = formData.workingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(79, 70, 229, 0.25)' : 'var(--bg-elevated)',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {day} {isSelected ? '✓' : ''}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
