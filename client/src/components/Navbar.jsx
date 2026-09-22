import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, ShieldCheck, Camera, LogOut, Building, Menu } from 'lucide-react';

export const Navbar = ({ onOpenKiosk, onToggleSidebar }) => {
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
    <header className="glass navbar">
      <div className="navbar-inner">
        
        {/* Left: Hamburger + Brand */}
        <div className="navbar-left">
          <button
            className="hamburger-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
          <div
            className="navbar-logo"
          >
            <ShieldCheck size={24} color="#fff" />
          </div>
          <div>
            <div className="navbar-brand-row">
              <span className="navbar-brand-name">
                BioTrack
              </span>
              <span className="badge badge-biometric navbar-badge-hide-mobile">
                Dual-Biometric
              </span>
            </div>
            <div className="navbar-business-name">
              <Building size={12} />
              <span>{owner?.businessName || 'Business Enterprise'}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Clock & Date - hidden on small mobile */}
        <div className="navbar-clock glass-card">
          <div className="navbar-clock-time">
            <Clock size={15} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formattedTime}</span>
          </div>
          <span style={{ color: 'var(--border-light)' }}>|</span>
          <span className="navbar-clock-date">{formattedDate}</span>
        </div>

        {/* Right: Kiosk + User */}
        <div className="navbar-right">
          <button
            onClick={onOpenKiosk}
            className="btn btn-kiosk navbar-kiosk-btn"
          >
            <Camera size={16} />
            <span className="navbar-kiosk-text">Launch Kiosk</span>
          </button>

          <div className="navbar-user">
            <div className="navbar-avatar">
              {owner?.name ? owner.name.charAt(0) : 'O'}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">
                {owner?.name || 'Owner'}
              </span>
              <span className="navbar-user-role">Administrator</span>
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
