import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [owner, setOwner] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('biotrack_token'));
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(localStorage.getItem('biotrack_role') || 'staff');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.auth.getMe();
        if (res.success && res.data) {
          setOwner(res.data);
        }
      } catch (err) {
        console.warn('Auto-auth session check:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    if (res.success && res.data) {
      setOwner(res.data);
      setToken(res.data.token);
      setUserRole('admin');
      localStorage.setItem('biotrack_token', res.data.token);
      localStorage.setItem('biotrack_role', 'admin');
      return res.data;
    }
  };

  const loginAsStaff = () => {
    setUserRole('staff');
    localStorage.setItem('biotrack_role', 'staff');
  };

  const loginAsAdmin = async (email, password) => {
    return await login(email, password);
  };

  const demoLogin = async () => {
    return await login('admin@biotrack.com', 'admin123');
  };

  const logout = () => {
    setOwner(null);
    setToken(null);
    setUserRole('staff');
    localStorage.removeItem('biotrack_token');
    localStorage.setItem('biotrack_role', 'staff');
  };

  const updateBusinessSettings = async (settings) => {
    const res = await api.auth.updateSettings(settings);
    if (res.success && res.data) {
      setOwner(res.data);
      return res.data;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        owner,
        token,
        loading,
        userRole,
        isStaff: userRole === 'staff',
        isAdmin: userRole === 'admin',
        login,
        loginAsStaff,
        loginAsAdmin,
        demoLogin,
        logout,
        updateBusinessSettings,
        isAuthenticated: !!owner || userRole === 'staff',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
