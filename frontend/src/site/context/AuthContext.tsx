import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../services/siteApi';
import type { LoginRequest, SignupRequest, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => api.getAuthToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(api.getAuthToken()));

  useEffect(() => {
    let active = true;
    const existingToken = api.getAuthToken();
    if (!existingToken) {
      setIsLoading(false);
      return;
    }

    api
      .getMe()
      .then((profile) => {
        if (active) {
          setUser(profile);
        }
      })
      .catch(() => {
        if (active) {
          api.setAuthToken(null);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const res = await api.login(payload);
    api.setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (payload: SignupRequest) => {
    const res = await api.signup(payload);
    api.setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const res = await api.googleLogin();
    api.setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    api.setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
