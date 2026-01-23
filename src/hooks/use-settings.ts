'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuth } from '@/hooks/use-auth';

export interface NotionConnection {
  accessToken: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
  parentPageId?: string; // Default page to export to
  parentPageName?: string;
}

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
  // Integration settings
  webhookUrl: string;
  notion: NotionConnection | null;
}

const DEFAULT_API_KEYS: Settings['apiKeys'] = {
  deepgram: '',
  elevenlabs: '',
  openai: '',
  anthropic: '',
};

const DEFAULT_SETTINGS: Settings = {
  apiKeys: DEFAULT_API_KEYS,
  transcriptionProvider: 'deepgram',
  llmProvider: 'openai',
  enrichmentMode: 'auto',
  hotkey: 'CommandOrControl+Shift+R',
  // Local defaults
  whisperEndpoint: 'http://localhost:8080',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  // Integration defaults
  webhookUrl: '',
  notion: null,
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
      // IMPORTANT: Exclude apiKeys from localStorage persistence
      // API keys are stored per-user in Tauri's encrypted storage
      partialize: (state) => ({
        settings: {
          ...state.settings,
          // Explicitly set empty apiKeys - they come from secure storage
          apiKeys: DEFAULT_API_KEYS,
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

export interface KeyValidationStatus {
  deepgram: boolean | null; // null = not validated yet, true = valid, false = invalid
  elevenlabs: boolean | null;
  openai: boolean | null;
  anthropic: boolean | null;
}

const DEFAULT_VALIDATION: KeyValidationStatus = {
  deepgram: null,
  elevenlabs: null,
  openai: null,
  anthropic: null,
};

async function validateApiKey(provider: string, key: string): Promise<boolean> {
  if (!key) return false;
  try {
    const response = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, key }),
    });
    const result = await response.json();
    return result.valid === true;
  } catch {
    return false;
  }
}

export function useSettings() {
  const { settings, setSettings, resetSettings } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [keyValidation, setKeyValidation] = useState<KeyValidationStatus>(DEFAULT_VALIDATION);
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedKeysRef = useRef<string>('');
  const lastValidatedKeysRef = useRef<string>('');

  // Hydrate on client side
  useEffect(() => {
    useSettingsStore.persist.rehydrate();
  }, []);

  // Save API keys to secure storage
  const saveApiKeys = useCallback(
    async (keys: Settings['apiKeys']) => {
      if (typeof window === 'undefined' || !window.__TAURI__ || !user?.email) {
        return;
      }

      const keysJson = JSON.stringify(keys);
      // Skip if keys haven't changed
      if (keysJson === lastSavedKeysRef.current) {
        return;
      }

      setIsSaving(true);
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_api_keys', {
          keys,
          userId: user.email,
        });
        lastSavedKeysRef.current = keysJson;
        console.log('[Settings] API keys saved for user:', user.email);
      } catch (error) {
        console.error('Failed to save API keys:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [user?.email]
  );

  // Debounced autosave when API keys change
  useEffect(() => {
    // Only autosave if we have a user and keys have values
    if (!user?.email) return;

    const hasAnyKey =
      settings.apiKeys.deepgram ||
      settings.apiKeys.elevenlabs ||
      settings.apiKeys.openai ||
      settings.apiKeys.anthropic;
    if (!hasAnyKey) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      saveApiKeys(settings.apiKeys);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings.apiKeys, user?.email, saveApiKeys]);

  const updateSettings = useCallback(
    (newSettings: Partial<Settings>) => {
      setSettings(newSettings);
    },
    [setSettings]
  );

  // Manual save (still available for explicit save button)
  const saveSettings = useCallback(async () => {
    await saveApiKeys(settings.apiKeys);
  }, [settings.apiKeys, saveApiKeys]);

  // Load API keys from secure storage when user changes
  useEffect(() => {
    const loadSecureKeys = async () => {
      setIsLoading(true);

      // Only load keys in Tauri
      if (typeof window === 'undefined' || !window.__TAURI__) {
        setIsLoading(false);
        return;
      }

      // If no user, clear keys from UI
      if (!user?.email) {
        setSettings({ apiKeys: DEFAULT_API_KEYS });
        lastSavedKeysRef.current = '';
        setIsLoading(false);
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
          lastSavedKeysRef.current = JSON.stringify(keys);
          console.log('[Settings] Loaded API keys for user:', user.email);
        } else {
          // New user or no keys saved yet - start with empty
          setSettings({ apiKeys: DEFAULT_API_KEYS });
          lastSavedKeysRef.current = '';
        }
      } catch (error) {
        console.error('Failed to load API keys:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecureKeys();
  }, [setSettings, user?.email]);

  // Validate API keys when they change
  useEffect(() => {
    // Skip validation while loading or if no keys
    if (isLoading) return;

    const keysJson = JSON.stringify(settings.apiKeys);
    // Skip if keys haven't changed since last validation
    if (keysJson === lastValidatedKeysRef.current) return;
    lastValidatedKeysRef.current = keysJson;

    const validateKeys = async () => {
      const newValidation: KeyValidationStatus = { ...DEFAULT_VALIDATION };

      // Only validate keys that have values
      const validations: Promise<void>[] = [];

      if (settings.apiKeys.deepgram) {
        validations.push(
          validateApiKey('deepgram', settings.apiKeys.deepgram).then((valid) => {
            newValidation.deepgram = valid;
          })
        );
      }
      if (settings.apiKeys.elevenlabs) {
        validations.push(
          validateApiKey('elevenlabs', settings.apiKeys.elevenlabs).then((valid) => {
            newValidation.elevenlabs = valid;
          })
        );
      }
      if (settings.apiKeys.openai) {
        validations.push(
          validateApiKey('openai', settings.apiKeys.openai).then((valid) => {
            newValidation.openai = valid;
          })
        );
      }
      if (settings.apiKeys.anthropic) {
        validations.push(
          validateApiKey('anthropic', settings.apiKeys.anthropic).then((valid) => {
            newValidation.anthropic = valid;
          })
        );
      }

      await Promise.all(validations);
      setKeyValidation(newValidation);
    };

    validateKeys();
  }, [settings.apiKeys, isLoading]);

  return {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isSaving,
    isLoading,
    keyValidation,
  };
}
