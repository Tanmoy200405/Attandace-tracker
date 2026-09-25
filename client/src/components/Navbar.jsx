import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Clock,
  ShieldCheck,
  Camera,
  LogOut,
  Building,
  Menu,
} from "lucide-react";

export const Navbar = ({ onOpenKiosk, onToggleSidebar }) => {
  const { owner, isStaff, logout } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
          <div>
            <div className="navbar-brand-row">
              <span
                className="navbar-brand-name"
                style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--primary)" }}
              >
                BioTrack
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Clock & Date - hidden on small mobile */}
        <div className="navbar-clock glass-card">
          <div className="navbar-clock-time">
            <Clock size={15} />
            <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
              {formattedTime}
            </span>
          </div>
          <span style={{ color: "var(--border-light)" }}>|</span>
          <span className="navbar-clock-date">{formattedDate}</span>
        </div>

        {/* Right: Kiosk + User */}
        <div className="navbar-right">
          <div className="navbar-user">
            <div className="navbar-avatar">
              {isStaff ? "S" : owner?.name ? owner.name.charAt(0) : "A"}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">
                {isStaff ? "Staff Kiosk" : owner?.name || "Administrator"}
              </span>
              <span
                className="navbar-user-role"
                style={{ color: isStaff ? "#a7f3d0" : "#93c5fd" }}
              >
                {isStaff ? "Staff Mode (Kiosk Only)" : "Administrator"}
              </span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                padding: "0.5rem",
                borderRadius: "8px",
                color: "var(--danger)",
                backgroundColor: "var(--danger-bg)",
                border: "1px solid var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
