import React, { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { AttendancePage } from "./pages/AttendancePage";
import { StaffPage } from "./pages/StaffPage";
import { KioskPage } from "./pages/KioskPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HolidaysPage } from "./pages/HolidaysPage";
import { LoginPage } from "./pages/LoginPage";
import { LogIn } from "lucide-react";

const AdminLogin = ({ setTab }) => {
  const { demoLogin } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password === "admin123") {
      setLoading(true);
      try {
        await demoLogin();
        setTab("dashboard");
      } catch (err) {
        setError("Login failed. Ensure backend is running.");
      } finally {
        setLoading(false);
      }
    } else {
      setError("Invalid password");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "2rem",
      }}
    >
      <div
        className="glass-card"
        style={{ maxWidth: "400px", width: "100%", padding: "2rem" }}
      >
        <h2
          style={{ textAlign: "center", marginBottom: "1.5rem", color: "#fff" }}
        >
          Admin Login
        </h2>
        {error && (
          <div
            style={{
              color: "#ef4444",
              marginBottom: "1rem",
              textAlign: "center",
              background: "rgba(239,68,68,0.1)",
              padding: "0.5rem",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: "1rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <LogIn size={18} />{" "}
            <span>{loading ? "Logging in..." : "Login"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export const App = () => {
  const { isAuthenticated, isStaff, loading } = useAuth();
  const [currentTab, setTab] = useState(isStaff ? "kiosk" : "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync tab if user switches to staff role
  React.useEffect(() => {
    if (isStaff && currentTab !== "kiosk" && currentTab !== "admin-login") {
      setTab("kiosk");
    }
  }, [isStaff, currentTab]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-main)",
          color: "var(--text-muted)",
          fontSize: "1rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="pulse-ring"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#ffffff",
              margin: "0 auto 1rem",
            }}
          />
          <span>Starting BioTrack Biometric System...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleTabChange = (tab) => {
    if (isStaff && tab !== "kiosk" && tab !== "admin-login") return; // Staff blocked from switching tabs
    setTab(tab);
    setSidebarOpen(false); // close sidebar on mobile when navigating
  };

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        currentTab={isStaff ? "kiosk" : currentTab}
        setTab={handleTabChange}
        isOpen={sidebarOpen}
      />

      <div className="main-content">
        <Navbar
          onOpenKiosk={() => handleTabChange("kiosk")}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main style={{ flex: 1 }}>
          {isStaff ? (
            <>
              {currentTab === "kiosk" && <KioskPage onClose={() => {}} />}
              {currentTab === "admin-login" && <AdminLogin setTab={setTab} />}
            </>
          ) : (
            <>
              {currentTab === "dashboard" && (
                <Dashboard setTab={handleTabChange} />
              )}
              {currentTab === "attendance" && <AttendancePage />}
              {currentTab === "staff" && <StaffPage />}
              {currentTab === "kiosk" && (
                <KioskPage onClose={() => handleTabChange("dashboard")} />
              )}
              {currentTab === "reports" && <ReportsPage />}
              {currentTab === "holidays" && <HolidaysPage />}
              {currentTab === "settings" && (
                <SettingsPage setTab={handleTabChange} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
