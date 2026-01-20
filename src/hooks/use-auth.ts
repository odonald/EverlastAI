'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Auth0Client } from '@auth0/auth0-spa-js';

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

// Auth0 configuration - these should be set via environment variables
const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '';
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '';

// Create Auth0 client singleton
let auth0Client: Auth0Client | null = null;

async function getAuth0Client(): Promise<Auth0Client> {
  if (auth0Client) return auth0Client;

  auth0Client = new Auth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  });

  return auth0Client;
}

export function useAuth(): AuthState {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React strict mode
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      // Check if Auth0 is configured
      if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
        console.warn('Auth0 not configured. Set NEXT_PUBLIC_AUTH0_DOMAIN and NEXT_PUBLIC_AUTH0_CLIENT_ID environment variables.');
        setIsLoading(false);
        return;
      }

      try {
        const client = await getAuth0Client();

        // Check if returning from Auth0 redirect
        const query = window.location.search;
        if (query.includes('code=') && query.includes('state=')) {
          await client.handleRedirectCallback();
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check for existing session
        const isAuthenticated = await client.isAuthenticated();
        if (isAuthenticated) {
          const auth0User = await client.getUser();
          if (auth0User) {
            setUser({
              email: auth0User.email || '',
              name: auth0User.name,
              picture: auth0User.picture,
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async () => {
    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
      console.error('Auth0 not configured. Please set environment variables.');
      return;
    }

    try {
      const client = await getAuth0Client();

      // Use popup for Tauri desktop app (redirect doesn't work well with Tauri)
      await client.loginWithPopup({
        authorizationParams: {
          redirect_uri: window.location.origin,
        },
      });

      const auth0User = await client.getUser();
      if (auth0User) {
        setUser({
          email: auth0User.email || '',
          name: auth0User.name,
          picture: auth0User.picture,
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const client = await getAuth0Client();
      await client.logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
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
