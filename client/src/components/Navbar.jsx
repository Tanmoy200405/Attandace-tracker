import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, ShieldCheck, Camera, LogOut, Building, User } from 'lucide-react';

export const Navbar = ({ onOpenKiosk }) => {
  const { owner, logout } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="glass" style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 2rem' }}>
        
        {/* Left: Brand & Business Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(79, 70, 229, 0.4)',
            }}
          >
            <ShieldCheck size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff', letterSpacing: '-0.02em' }}>
                BioTrack
              </span>
              <span className="badge badge-biometric" style={{ fontSize: '0.65rem' }}>
                Dual-Biometric
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building size={12} />
              <span>{owner?.businessName || 'Business Enterprise'}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Clock & Date */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.35rem 1rem',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600 }}>
            <Clock size={15} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formattedTime}</span>
          </div>
          <span style={{ color: 'var(--border-light)' }}>|</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formattedDate}</span>
        </div>

        {/* Right: Kiosk Mode Launcher & User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onOpenKiosk}
            className="btn btn-kiosk"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Camera size={16} />
            <span>Launch Kiosk</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#1f2937',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {owner?.name ? owner.name.charAt(0) : 'O'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
                {owner?.name || 'Owner'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Administrator</span>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary"
              title="Logout"
              style={{ padding: '0.4rem', borderRadius: '8px', color: 'var(--text-muted)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
