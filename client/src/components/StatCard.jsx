import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, color = '#4f46e5', trend }) => {
  return (
    <div
      className="glass-card"
      style={{
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Accent glow line at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: `${color}18`,
            border: `1px solid ${color}35`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {Icon && <Icon size={18} />}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
          {value}
        </span>
        {trend && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: color }}>
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
};
