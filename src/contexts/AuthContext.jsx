import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

const API_BASE = 'http://127.0.0.1:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const applyToken = (value) => {
    if (value) {
      axios.defaults.headers.common.Authorization = `Bearer ${value}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/auth/me`);
      setUser(res.data.user);
    } catch (error) {
      console.error('Profile fetch failed', error);
      setUser(null);
      setToken(null);
      applyToken(null);
      localStorage.removeItem('kyc_token');
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('kyc_token');
    if (storedToken) {
      setToken(storedToken);
      applyToken(storedToken);
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setShowAuthModal(true);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
    setToken(res.data.token);
    applyToken(res.data.token);
    localStorage.setItem('kyc_token', res.data.token);
    setUser(res.data.user);
    setShowAuthModal(false);
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API_BASE}/api/auth/register`, { name, email, password });
    setToken(res.data.token);
    applyToken(res.data.token);
    localStorage.setItem('kyc_token', res.data.token);
    setUser(res.data.user);
    setShowAuthModal(false);
  };

  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/api/auth/logout`);
    } catch (error) {
      console.error('Logout error', error);
    }
    setUser(null);
    setToken(null);
    applyToken(null);
    localStorage.removeItem('kyc_token');
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => setShowAuthModal(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        showAuthModal,
        openAuthModal,
        closeAuthModal,
        authMode,
        setAuthMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

