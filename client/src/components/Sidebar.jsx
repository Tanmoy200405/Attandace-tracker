import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Camera,
  BarChart3,
  Settings,
  Fingerprint,
} from 'lucide-react';

export const Sidebar = ({ currentTab, setTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck },
    { id: 'staff', label: 'Staff Directory', icon: Users },
    { id: 'kiosk', label: 'Biometric Kiosk', icon: Camera, highlight: true },
    { id: 'reports', label: 'Monthly Reports', icon: BarChart3 },
    { id: 'settings', label: 'Shift Settings', icon: Settings },
  ];

  return (
    <aside
      className="glass"
      style={{
        width: '240px',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        gap: '0.5rem',
      }}
    >
      <div style={{ padding: '0 0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
        Management
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isActive
                  ? item.highlight
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)'
                    : 'rgba(79, 70, 229, 0.15)'
                  : 'transparent',
                border: isActive
                  ? item.highlight
                    ? '1px solid rgba(6, 182, 212, 0.4)'
                    : '1px solid rgba(79, 70, 229, 0.3)'
                  : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon
                size={18}
                color={isActive ? (item.highlight ? '#22d3ee' : '#818cf8') : 'currentColor'}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.highlight && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#22d3ee',
                    boxShadow: '0 0 8px #22d3ee',
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Biometric Status Summary Box */}
      <div
        className="glass-card"
        style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(31, 41, 55, 0.4)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Fingerprint size={16} color="#06b6d4" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f3f4f6' }}>Biometric Engine</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Face & Fingerprint sensors active for daily clock-ins.
        </div>
      </div>
    </aside>
  );
};
