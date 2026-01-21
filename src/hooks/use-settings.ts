'use client';

import { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuth } from '@/hooks/use-auth';

export interface Settings {
  apiKeys: {
    deepgram: string;
    elevenlabs: string;
    openai: string;
    anthropic: string;
  };
  transcriptionProvider: 'deepgram' | 'elevenlabs' | 'whisper';
  llmProvider: 'openai' | 'anthropic' | 'ollama';
  enrichmentMode: 'auto' | 'notes' | 'summary' | 'action-items' | 'format';
  hotkey: string;
  // Local/Open Source settings
  whisperEndpoint: string;
  ollamaEndpoint: string;
  ollamaModel: string;
}

const DEFAULT_SETTINGS: Settings = {
  apiKeys: {
    deepgram: '',
    elevenlabs: '',
    openai: '',
    anthropic: '',
  },
  transcriptionProvider: 'deepgram',
  llmProvider: 'openai',
  enrichmentMode: 'auto',
  hotkey: 'CommandOrControl+Shift+R',
  // Local defaults
  whisperEndpoint: 'http://localhost:8080',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
};

interface SettingsStore {
  settings: Settings;
  setSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
}

// Zustand store for settings state
const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'everlast-settings',
      // Skip hydration during SSR
      skipHydration: true,
      // In production, API keys should be stored in OS keychain via Tauri
      partialize: (state) => ({
        settings: {
          ...state.settings,
          // Don't persist API keys to localStorage in production
          // They should go to secure storage
        },
      }),
      // Handle corrupted localStorage gracefully
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate settings, using defaults:', error);
          // Clear corrupted data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('everlast-settings');
          }
        }
      },
    }
  )
);

export function useSettings() {
  const { settings, setSettings, resetSettings } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  // Hydrate on client side
  useEffect(() => {
    useSettingsStore.persist.rehydrate();
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<Settings>) => {
      setSettings(newSettings);
    },
    [setSettings]
  );

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      // In production with Tauri, save API keys to secure storage (per-user)
      if (typeof window !== 'undefined' && window.__TAURI__ && user?.email) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_api_keys', {
          keys: settings.apiKeys,
          userId: user.email,
        });
      }
      // Settings are automatically persisted via zustand
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [settings.apiKeys, user?.email]);

  // Load API keys from secure storage when user changes
  useEffect(() => {
    const loadSecureKeys = async () => {
      // Only load keys in Tauri and when we have a user
      if (typeof window === 'undefined' || !window.__TAURI__) {
        return;
      }

      // If no user, clear keys from UI (don't load anonymous keys)
      if (!user?.email) {
        setSettings({
          apiKeys: {
            deepgram: '',
            elevenlabs: '',
            openai: '',
            anthropic: '',
          }
        });
        return;
      }

      // User is logged in - load their keys
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const keys = await invoke<Settings['apiKeys']>('get_api_keys', {
          userId: user.email,
        });

        // Check if keys have any actual values
        const hasKeys = keys && (keys.deepgram || keys.elevenlabs || keys.openai || keys.anthropic);

        if (hasKeys) {
          setSettings({ apiKeys: keys });
        } else {
          // New user or no keys saved yet - start with empty
          setSettings({
            apiKeys: {
              deepgram: '',
              elevenlabs: '',
              openai: '',
              anthropic: '',
            }
          });
        }
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    };

    loadSecureKeys();
  }, [setSettings, user?.email]);

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isSaving,
  };
}
