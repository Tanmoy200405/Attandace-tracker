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
          <div className="pulse-ring" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#4f46e5', margin: '0 auto 1rem' }} />
          <span>Starting BioTrack Biometric System...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setTab={setTab} />

      <div className="main-content">
        <Navbar onOpenKiosk={() => setTab('kiosk')} />

        <main style={{ flex: 1 }}>
          {currentTab === 'dashboard' && <Dashboard setTab={setTab} />}
          {currentTab === 'attendance' && <AttendancePage />}
          {currentTab === 'staff' && <StaffPage />}
          {currentTab === 'kiosk' && <KioskPage onClose={() => setTab('dashboard')} />}
          {currentTab === 'reports' && <ReportsPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};
