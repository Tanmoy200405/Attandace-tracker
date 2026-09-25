import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Camera,
  BarChart3,
  Settings,
  Fingerprint,
  X,
} from "lucide-react";

export const Sidebar = ({ currentTab, setTab, isOpen }) => {
  const { isStaff } = useAuth();

  const allNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Daily Attendance", icon: CalendarCheck },
    { id: "staff", label: "Staff Directory", icon: Users },
    { id: "kiosk", label: "Biometric Kiosk", icon: Camera, highlight: true },
    { id: "reports", label: "Monthly Reports", icon: BarChart3 },
    { id: "settings", label: "Shift Settings", icon: Settings },
  ];

  // Staff members see Biometric and Admin Login
  const navItems = isStaff
    ? [
        {
          id: "kiosk",
          label: "Biometric Kiosk",
          icon: Camera,
          highlight: true,
        },
        { id: "admin-login", label: "Admin Login", icon: Settings },
      ]
    : allNavItems;

  return (
    <aside className={`glass sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-header">
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-dim)",
          }}
        >
          Management
        </span>
        <button
          className="sidebar-close-btn"
          onClick={() => setTab(currentTab)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          flex: 1,
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.highlight && (
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    boxShadow: "0 0 8px rgba(255,255,255,0.5)",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Biometric Status Summary Box */}
      <div className="glass-card sidebar-bio-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <Fingerprint size={16} color="#cccccc" />
          <span
            style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f3f4f6" }}
          >
            Biometric Engine
          </span>
        </div>
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            lineHeight: 1.4,
          }}
        >
          Face & Fingerprint sensors active for daily clock-ins.
        </div>
      </div>
    </aside>
  );
};
