import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '@/src/utils/storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = 'auth_token';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistToken = async (newToken: string) => {
    await storage.secureSet(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const clearToken = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const fetchCurrentUser = async (authToken: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    const userData = await response.json();
    setUser(userData);
    return userData;
  };

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    await persistToken(data.access_token);
    setUser(data.user);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    await persistToken(data.access_token);
    setUser(data.user);
  };

  const signOut = async () => {
    await clearToken();
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await storage.secureGet(TOKEN_KEY, '');
        if (storedToken && typeof storedToken === 'string') {
          setToken(storedToken);
          await fetchCurrentUser(storedToken);
        }
      } catch (e) {
        console.log('Bootstrap error - clearing token', e);
        await clearToken();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Helper for authenticated API calls
export const authFetch = async (token: string | null, url: string, options: RequestInit = {}) => {
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
};
