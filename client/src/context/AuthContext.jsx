import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [owner, setOwner] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('biotrack_token'));
  const [loading, setLoading] = useState(true);

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
      localStorage.setItem('biotrack_token', res.data.token);
      return res.data;
    }
  };

  const demoLogin = async () => {
    return await login('owner@enterprise.com', 'password123');
  };

  const logout = () => {
    setOwner(null);
    setToken(null);
    localStorage.removeItem('biotrack_token');
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
        login,
        demoLogin,
        logout,
        updateBusinessSettings,
        isAuthenticated: !!owner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
