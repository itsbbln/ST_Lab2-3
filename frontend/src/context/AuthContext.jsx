import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiRequest, { SESSION_EXPIRED_EVENT } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('sim_user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('sim_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest('/auth/me');
        setUser(response.data);
        localStorage.setItem('sim_user', JSON.stringify(response.data));
      } catch (error) {
        localStorage.removeItem('sim_token');
        localStorage.removeItem('sim_user');
        setToken('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem('sim_token');
      localStorage.removeItem('sim_user');
      setToken('');
      setUser(null);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const login = async (email, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const authToken = response.data.token;
    const authUser = response.data.user;

    localStorage.setItem('sim_token', authToken);
    localStorage.setItem('sim_user', JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
    return response;
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Clear local session even when the API is temporarily unreachable.
    } finally {
      localStorage.removeItem('sim_token');
      localStorage.removeItem('sim_user');
      setToken('');
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(token && user),
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
