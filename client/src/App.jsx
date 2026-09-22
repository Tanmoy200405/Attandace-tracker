import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AttendancePage } from './pages/AttendancePage';
import { StaffPage } from './pages/StaffPage';
import { KioskPage } from './pages/KioskPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

export const App = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentTab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-muted)',
          fontSize: '1rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-ring" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ffffff', margin: '0 auto 1rem' }} />
          <span>Starting BioTrack Biometric System...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleTabChange = (tab) => {
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

      <Sidebar currentTab={currentTab} setTab={handleTabChange} isOpen={sidebarOpen} />

      <div className="main-content">
        <Navbar onOpenKiosk={() => handleTabChange('kiosk')} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main style={{ flex: 1 }}>
          {currentTab === 'dashboard' && <Dashboard setTab={handleTabChange} />}
          {currentTab === 'attendance' && <AttendancePage />}
          {currentTab === 'staff' && <StaffPage />}
          {currentTab === 'kiosk' && <KioskPage onClose={() => handleTabChange('dashboard')} />}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};
