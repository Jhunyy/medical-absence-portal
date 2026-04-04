import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(res  => setUser(res.data.user))
      .catch(()  => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  // Listen for 401 fired by api.js interceptor — navigate without full reload
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      navigate('/login', { replace: true, state: { expired: true } });
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [navigate]);

  const register = useCallback(async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* swallow */ }
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const isAuthenticated = !!user;
  const isStudent       = user?.role === 'student';
  const isHealthOfficer = user?.role === 'health_officer';
  const isAdmin         = user?.role === 'admin';
  const isProfessor     = user?.role === 'professor';
  const hasRole         = useCallback((...roles) => roles.flat().includes(user?.role), [user]);

  return (
    <AuthContext.Provider value={{
      user, loading,
      isAuthenticated, isStudent, isHealthOfficer, isAdmin, isProfessor, hasRole,
      register, login, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};