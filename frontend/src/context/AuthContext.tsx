import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, authApi } from '../services/authApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('stocksense_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const storedToken = localStorage.getItem('stocksense_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res.data?.user) {
        setUser(res.data.user);
      } else {
        localStorage.removeItem('stocksense_token');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.warn('Failed to fetch user session:', error);
      localStorage.removeItem('stocksense_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('stocksense_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('stocksense_token');
    setToken(null);
    setUser(null);
    authApi.logout().catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        loading: isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
