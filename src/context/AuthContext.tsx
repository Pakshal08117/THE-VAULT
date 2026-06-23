import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (email: string, username: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  updateProfile: (displayName: string) => Promise<User>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapUser = (backendUser: any): User => ({
  id: backendUser.id,
  email: backendUser.email,
  username: backendUser.display_name || backendUser.email.split('@')[0],
  role: backendUser.role || 'USER',
  created_at: backendUser.created_at,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem('vault_access_token');
      const storedUser = localStorage.getItem('vault_user');
      
      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Verify session integrity with server
          const meData = await api.get('/api/v1/auth/me');
          const verifiedUser = mapUser(meData);
          localStorage.setItem('vault_user', JSON.stringify(verifiedUser));
          setUser(verifiedUser);
        } catch (e) {
          localStorage.removeItem('vault_user');
          localStorage.removeItem('vault_access_token');
          localStorage.removeItem('vault_refresh_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initSession();
  }, []);

  const register = async (email: string, username: string, password: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/v1/auth/register', {
        email,
        password,
        display_name: username,
      });

      const registeredUser = mapUser(response.user);
      localStorage.setItem('vault_access_token', response.access_token);
      localStorage.setItem('vault_refresh_token', response.refresh_token);
      localStorage.setItem('vault_user', JSON.stringify(registeredUser));
      
      setUser(registeredUser);
      return registeredUser;
    } catch (e: any) {
      const errMsg = e.message || e.errors || 'Registration failed.';
      const formattedMsg = typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg;
      setError(formattedMsg);
      throw new Error(formattedMsg);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/v1/auth/login', {
        email,
        password,
      });

      const loggedInUser = mapUser(response.user);
      localStorage.setItem('vault_access_token', response.access_token);
      localStorage.setItem('vault_refresh_token', response.refresh_token);
      localStorage.setItem('vault_user', JSON.stringify(loggedInUser));

      setUser(loggedInUser);
      return loggedInUser;
    } catch (e: any) {
      const errMsg = e.message || 'Invalid email or password.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('vault_user');
    localStorage.removeItem('vault_access_token');
    localStorage.removeItem('vault_refresh_token');
    setUser(null);
  };

  const updateProfile = async (displayName: string): Promise<User> => {
    const response = await api.put('/api/v1/auth/profile', { display_name: displayName });
    const updatedUser = mapUser(response.user);
    localStorage.setItem('vault_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, logout, updateProfile, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
