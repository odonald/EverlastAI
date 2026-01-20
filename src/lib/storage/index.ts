type ApiKeyType = 'deepgram' | 'elevenlabs' | 'openai' | 'anthropic';

// In-memory cache for API keys during session
const keyCache = new Map<ApiKeyType, string>();

/**
 * Get an API key from secure storage
 * In Tauri: Uses OS keychain via Tauri commands
 * In browser: Falls back to localStorage (dev only)
 */
export async function getApiKey(type: ApiKeyType): Promise<string | null> {
  console.log(`getApiKey called for: ${type}`);
  // Check cache first
  const cached = keyCache.get(type);
  if (cached) {
    console.log(`Found ${type} in cache`);
    return cached;
  }

  try {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      console.log(`Using Tauri storage for ${type}`);
      // Use Tauri's secure storage
      const { invoke } = await import('@tauri-apps/api/core');
      const key = await invoke<string | null>('get_api_key', { keyType: type });
      console.log(`Tauri returned for ${type}:`, key ? 'found' : 'not found');
      if (key) {
        keyCache.set(type, key);
      }
      return key;
    } else {
      console.log(`Using localStorage fallback for ${type}`);
      // Fallback for development in browser
      const stored = localStorage.getItem(`everlast_key_${type}`);
      console.log(`localStorage returned for ${type}:`, stored ? 'found' : 'not found');
      if (stored) {
        keyCache.set(type, stored);
      }
      return stored;
    }
  } catch (error) {
    console.error(`Failed to get API key for ${type}:`, error);
    return null;
  }
}

/**
 * Save an API key to secure storage
 */
export async function saveApiKey(type: ApiKeyType, key: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      // Use Tauri's secure storage
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_api_key', { keyType: type, key });
    } else {
      // Fallback for development
      localStorage.setItem(`everlast_key_${type}`, key);
    }
    keyCache.set(type, key);
  } catch (error) {
    console.error(`Failed to save API key for ${type}:`, error);
    throw error;
  }
}

/**
 * Delete an API key from secure storage
 */
export async function deleteApiKey(type: ApiKeyType): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_api_key', { keyType: type });
    } else {
      localStorage.removeItem(`everlast_key_${type}`);
    }
    keyCache.delete(type);
  } catch (error) {
    console.error(`Failed to delete API key for ${type}:`, error);
    throw error;
  }
}

/**
 * Check if an API key is configured
 */
export async function hasApiKey(type: ApiKeyType): Promise<boolean> {
  const key = await getApiKey(type);
  return !!key && key.length > 0;
}
