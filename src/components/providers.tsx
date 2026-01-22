'use client';

import { useEffect } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';

/**
 * Component that syncs next-themes with Tauri's system theme detection.
 * This is needed because Tauri's webview doesn't always properly detect system theme.
 */
function TauriThemeSync() {
  const { theme } = useTheme();

  useEffect(() => {
    // Only run in Tauri environment
    if (!window.__TAURI__) {
      return;
    }

    let unlisten: (() => void) | undefined;

    const setupTauriThemeSync = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const currentWindow = getCurrentWindow();

        // Get initial theme from Tauri
        const systemTheme = await currentWindow.theme();

        // If user has system theme preference, apply the actual system theme
        if (theme === 'system' && systemTheme) {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(systemTheme);
        }

        // Listen for system theme changes
        unlisten = await currentWindow.onThemeChanged(({ payload: newTheme }) => {
          if (theme === 'system' && newTheme) {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(newTheme);
          }
        });
      } catch (error) {
        console.error('Failed to setup Tauri theme sync:', error);
      }
    };

    setupTauriThemeSync();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [theme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TauriThemeSync />
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
