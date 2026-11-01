import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '../types';
import { api, setCsrfToken } from '../services/api';
import { isDevBypassEnabled } from '../services/mockApi';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (credential: string) => Promise<void>;
  loginWithDevPersona: (personaKey: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isTeamHead: boolean;
  isViewer: boolean;
  assignedTeamId: string | null;
  refreshSession: () => Promise<void>;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getSession();
      setUser(data.user);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
    } catch (err: any) {
      setUser(null);
      // Not logged in or expired session is expected initially
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (credential: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.loginWithGoogle(credential);
      setUser(data.user);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials or contact administrator.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithDevPersona = async (personaKey: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.loginWithDevPersona(personaKey);
      setUser(data.user);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
    } catch (err: any) {
      setError(err.message || 'Dev login failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isTeamHead = user?.role === 'team_head';
  const isViewer = user?.role === 'viewer';
  const assignedTeamId = user?.teamId && user.teamId !== 'all' ? user.teamId : null;
  const isDevMode = isDevBypassEnabled();

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        loginWithDevPersona,
        logout,
        isAdmin,
        isTeamHead,
        isViewer,
        assignedTeamId,
        refreshSession: checkSession,
        isDevMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
