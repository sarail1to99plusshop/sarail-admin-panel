import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminLoginAPI } from '../services/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('admin_token') || '';
    } catch {
      return '';
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('admin_token');
      const storedUser = localStorage.getItem('admin_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setAdmin(JSON.parse(storedUser));
      } else {
        setAdmin(null);
        setToken('');
      }
    } catch (e) {
      console.warn('Failed to parse admin storage:', e);
      setAdmin(null);
      setToken('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await adminLoginAPI({ email, password });
    if (data?.token && data?.admin) {
      setToken(data.token);
      setAdmin(data.admin);
      return data;
    }
    throw new Error(data?.message || 'Admin login failed');
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    } catch {
      // ignore
    }
    setToken('');
    setAdmin(null);
  }, []);

  const value = {
    admin,
    token,
    isAuthenticated: Boolean(token && admin),
    isLoading,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export default AdminAuthContext;

