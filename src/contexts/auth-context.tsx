'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Auth0Client } from '@auth0/auth0-spa-js';

interface User {
  email: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isWaitingForAuth: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Auth0 configuration
const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '';
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '';

// Check if running in Tauri
const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI__;

// Generate a random session ID
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Auth0 client singleton
let auth0Client: Auth0Client | null = null;
let auth0InitError: Error | null = null;

async function getAuth0Client(): Promise<Auth0Client | null> {
  if (auth0InitError) return null;
  if (auth0Client) return auth0Client;

  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    console.warn('Auth0 not configured');
    return null;
  }

  try {
    auth0Client = new Auth0Client({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      authorizationParams: {
        redirect_uri: 'http://localhost:3000',
      },
    });
    return auth0Client;
  } catch (error) {
    auth0InitError = error as Error;
    console.error('Failed to initialize Auth0:', error);
    return null;
  }
}

const PENDING_AUTH_SESSION_KEY = 'everlast_pending_auth_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const initRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for auth session completion (Tauri only)
  const pollForAuthSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/auth/session?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.found && data.tokens) {
        // Stop polling first
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        const userData = {
          email: data.tokens.email || '',
          name: data.tokens.name,
          picture: data.tokens.picture,
        };

        // Store for persistence
        localStorage.setItem('everlast_user', JSON.stringify(userData));
        localStorage.removeItem(PENDING_AUTH_SESSION_KEY);

        // Bring window to foreground and reload
        if (isTauri()) {
          try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const win = getCurrentWindow();
            await win.show();
            await win.setFocus();
            window.location.reload();
          } catch (e) {
            console.error('Failed to focus window:', e);
            window.location.reload();
          }
        } else {
          setIsWaitingForAuth(false);
          setUser(userData);
        }

        return true;
      }
    } catch (error) {
      console.error('Failed to poll auth session:', error);
    }
    return false;
  }, []);

  // Handle auth callback (web only)
  const handleAuthCallback = useCallback(async () => {
    try {
      const client = await getAuth0Client();
      if (!client) return;

      const query = window.location.search;
      if (!query.includes('code=') || !query.includes('state=')) return;

      await client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);

      const auth0User = await client.getUser();

      if (auth0User) {
        let wasTauriAuth = false;
        if (!isTauri()) {
          try {
            const pendingResp = await fetch('/api/auth/session?getPending=true');
            const pendingData = await pendingResp.json();

            if (pendingData.sessionId) {
              wasTauriAuth = true;
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: pendingData.sessionId,
                  tokens: {
                    email: auth0User.email,
                    name: auth0User.name,
                    picture: auth0User.picture,
                  },
                }),
              });
              sessionStorage.setItem('everlast_auth_callback', 'complete');
            }
          } catch {
            // Ignore API errors
          }
        }

        if (!wasTauriAuth) {
          setUser({
            email: auth0User.email || '',
            name: auth0User.name,
            picture: auth0User.picture,
          });
        }
      }
    } catch (error) {
      console.error('Auth callback failed:', error);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      try {
        // Check for stored user
        const storedUser = localStorage.getItem('everlast_user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser({
              email: userData.email || '',
              name: userData.name,
              picture: userData.picture,
            });
            setIsLoading(false);
            return;
          } catch {
            localStorage.removeItem('everlast_user');
          }
        }

        const client = await getAuth0Client();

        if (!client) {
          setIsLoading(false);
          return;
        }

        // Check if returning from Auth0 redirect
        if (window.location.search.includes('code=')) {
          await handleAuthCallback();
          setIsLoading(false);
          return;
        }

        // Check for existing Auth0 session
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

        // Clear any stale pending auth sessions
        if (isTauri()) {
          localStorage.removeItem(PENDING_AUTH_SESSION_KEY);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [handleAuthCallback]);

  const login = useCallback(async () => {
    try {
      const client = await getAuth0Client();

      if (!client) {
        console.error('Auth0 not configured.');
        return;
      }

      if (isTauri()) {
        const sessionId = generateSessionId();
        localStorage.setItem(PENDING_AUTH_SESSION_KEY, sessionId);

        // Set waiting state BEFORE anything else
        setIsWaitingForAuth(true);

        // Register pending session with API
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, action: 'start' }),
        });

        // Start polling
        pollingRef.current = setInterval(() => {
          pollForAuthSession(sessionId);
        }, 1000);

        // Open Auth0 in browser - force login prompt, don't auto-login
        await client.loginWithRedirect({
          authorizationParams: {
            redirect_uri: 'http://localhost:3000',
            prompt: 'login', // Force showing login screen
            max_age: 0, // Treat any existing session as expired
          },
          async openUrl(url) {
            const { open } = await import('@tauri-apps/plugin-shell');
            await open(url);
          },
        });
      } else {
        await client.loginWithRedirect({
          authorizationParams: {
            redirect_uri: window.location.origin,
            prompt: 'login',
            max_age: 0,
          },
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsWaitingForAuth(false);
      localStorage.removeItem(PENDING_AUTH_SESSION_KEY);
    }
  }, [pollForAuthSession]);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('everlast_user');
      localStorage.removeItem(PENDING_AUTH_SESSION_KEY);

      const client = await getAuth0Client();
      if (client) {
        if (isTauri()) {
          await client.logout({ openUrl: false });
          window.location.reload();
        } else {
          await client.logout({
            logoutParams: { returnTo: window.location.origin },
          });
        }
      } else {
        setUser(null);
        if (isTauri()) {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('everlast_user');
      setUser(null);
      if (isTauri()) {
        window.location.reload();
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        isWaitingForAuth,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Type augmentation for Tauri
declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}
