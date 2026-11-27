import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../services/siteApi';
import { fetchCredits, type CreditBalances } from '../../services/creditsApi';
import type { LoginRequest, SignupRequest, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  credits: CreditBalances | null;
  refreshCredits: () => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => api.getAuthToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(api.getAuthToken()));
  const [credits, setCredits] = useState<CreditBalances | null>(null);

  const refreshCredits = useCallback(async () => {
    if (!api.getAuthToken()) {
      setCredits(null);
      return;
    }
    try {
      const res = await fetchCredits();
      setCredits(res.balances);
    } catch {
      // ignore transient errors
    }
  }, []);

  useEffect(() => {
    if (user && token) {
      void refreshCredits();
    } else {
      setCredits(null);
    }
  }, [user, token, refreshCredits]);

  useEffect(() => {
    const handler = () => {
      void refreshCredits();
    };
    window.addEventListener('credits:refresh', handler);
    return () => window.removeEventListener('credits:refresh', handler);
  }, [refreshCredits]);

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

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const res = await api.googleLogin({ idToken });
    api.setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    api.setAuthToken(null);
    setToken(null);
    setUser(null);
    setCredits(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        credits,
        refreshCredits,
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
