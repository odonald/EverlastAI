'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  email: string;
  name?: string;
  picture?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// This will be replaced with actual Auth0 implementation
// For now, using a mock for development
export function useAuth(): AuthState {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        // In production, this would check Auth0 session
        const storedUser = localStorage.getItem('everlast_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async () => {
    try {
      // In production, this triggers Auth0 login flow
      // For development, mock login
      if (typeof window !== 'undefined' && window.__TAURI__) {
        // Tauri environment - use Auth0 with custom scheme
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke('auth0_login');
        setUser(result as User);
      } else {
        // Web environment - use redirect
        const mockUser = { email: 'demo@everlast.ai', name: 'Demo User' };
        localStorage.setItem('everlast_user', JSON.stringify(mockUser));
        setUser(mockUser);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('everlast_user');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  return {
    isAuthenticated: !!user,
    isLoading,
    user,
    login,
    logout,
  };
}

// Type augmentation for Tauri
declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}
