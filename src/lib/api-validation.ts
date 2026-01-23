/**
 * API Key Validation for all providers
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  info?: Record<string, unknown>;
}

/**
 * Validate Deepgram API key
 */
export async function validateDeepgramKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { Authorization: `Token ${apiKey}` },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        info: { projectName: data.projects?.[0]?.name },
      };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { valid: false, error: `API error: ${response.status}` };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Validate OpenAI API key
 */
export async function validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true, info: { rateLimited: true } };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `API error: ${response.status}`,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Validate Anthropic API key
 */
export async function validateAnthropicKey(apiKey: string): Promise<ValidationResult> {
  try {
    // Anthropic doesn't have a simple validation endpoint
    // We'll make a minimal messages request that will fail fast if key is invalid
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    // Any 2xx response means the key is valid
    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 400) {
      // Bad request but authenticated - key is valid
      return { valid: true };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true, info: { rateLimited: true } };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `API error: ${response.status}`,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Validate ElevenLabs API key
 */
export async function validateElevenLabsKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        info: {
          subscription: data.subscription?.tier,
          characterCount: data.subscription?.character_count,
          characterLimit: data.subscription?.character_limit,
        },
      };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { valid: false, error: `API error: ${response.status}` };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Validate Ollama endpoint (local)
 */
export async function validateOllamaEndpoint(endpoint: string): Promise<ValidationResult> {
  try {
    const url = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        info: {
          models: data.models?.map((m: { name: string }) => m.name) || [],
        },
      };
    }

    return { valid: false, error: `Ollama not responding: ${response.status}` };
  } catch (error) {
    return {
      valid: false,
      error: 'Cannot connect to Ollama. Is it running?',
    };
  }
}

/**
 * Validate Whisper endpoint (local)
 */
export async function validateWhisperEndpoint(endpoint: string): Promise<ValidationResult> {
  try {
    const url = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const response = await fetch(`${url}/health`, {
      method: 'GET',
    });

    if (response.ok) {
      return { valid: true };
    }

    // Try root endpoint as fallback
    const rootResponse = await fetch(url, { method: 'GET' });
    if (rootResponse.ok) {
      return { valid: true };
    }

    return { valid: false, error: `Whisper server not responding: ${response.status}` };
  } catch (error) {
    return {
      valid: false,
      error: 'Cannot connect to Whisper server. Is it running?',
    };
  }
}

export type ProviderType =
  | 'deepgram'
  | 'openai'
  | 'anthropic'
  | 'elevenlabs'
  | 'ollama'
  | 'whisper';

/**
 * Validate any provider's API key/endpoint
 */
export async function validateProvider(
  provider: ProviderType,
  keyOrEndpoint: string
): Promise<ValidationResult> {
  switch (provider) {
    case 'deepgram':
      return validateDeepgramKey(keyOrEndpoint);
    case 'openai':
      return validateOpenAIKey(keyOrEndpoint);
    case 'anthropic':
      return validateAnthropicKey(keyOrEndpoint);
    case 'elevenlabs':
      return validateElevenLabsKey(keyOrEndpoint);
    case 'ollama':
      return validateOllamaEndpoint(keyOrEndpoint);
    case 'whisper':
      return validateWhisperEndpoint(keyOrEndpoint);
    default:
      return { valid: false, error: 'Unknown provider' };
  }
}
