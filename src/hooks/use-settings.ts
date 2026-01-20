'use client';

import { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Settings {
  apiKeys: {
    deepgram: string;
    elevenlabs: string;
    openai: string;
    anthropic: string;
  };
  transcriptionProvider: 'deepgram' | 'elevenlabs';
  llmProvider: 'openai' | 'anthropic';
  enrichmentMode: 'auto' | 'notes' | 'summary' | 'action-items' | 'format';
  hotkey: string;
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
  hotkey: 'CommandOrControl+Shift+Space',
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
      // In production, API keys should be stored in OS keychain via Tauri
      partialize: (state) => ({
        settings: {
          ...state.settings,
          // Don't persist API keys to localStorage in production
          // They should go to secure storage
        },
      }),
    }
  )
);

export function useSettings() {
  const { settings, setSettings, resetSettings } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  const updateSettings = useCallback(
    (newSettings: Partial<Settings>) => {
      setSettings(newSettings);
    },
    [setSettings]
  );

  const saveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      // In production with Tauri, save API keys to secure storage
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_api_keys', { keys: settings.apiKeys });
      }
      // Settings are automatically persisted via zustand
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [settings.apiKeys]);

  // Load API keys from secure storage on mount
  useEffect(() => {
    const loadSecureKeys = async () => {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const keys = await invoke<typeof settings.apiKeys>('get_api_keys');
          if (keys) {
            setSettings({ apiKeys: keys });
          }
        } catch (error) {
          console.error('Failed to load API keys:', error);
        }
      }
    };

    loadSecureKeys();
  }, [setSettings]);

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isSaving,
  };
}
