/**
 * Ollama LLM integration for local text enrichment
 * Default endpoint: http://localhost:11434
 */

import { getSystemPrompt, EnrichmentMode } from './index';

const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';

export async function enrichWithOllama(
  text: string,
  mode: EnrichmentMode,
  endpoint?: string,
  model?: string
): Promise<string> {
  const baseUrl = endpoint || DEFAULT_OLLAMA_ENDPOINT;
  const modelName = model || DEFAULT_MODEL;

  const systemPrompt = getSystemPrompt(mode);

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: `${systemPrompt}\n\nTranscribed text:\n${text}\n\nProcessed output:`,
        stream: false,
        options: {
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to Ollama at ${baseUrl}. ` +
        'Make sure Ollama is running (ollama serve) and the model is pulled.'
      );
    }
    throw error;
  }
}

/**
 * Check if Ollama is available and list models
 */
export async function checkOllamaStatus(endpoint?: string): Promise<{
  available: boolean;
  models: string[];
}> {
  const baseUrl = endpoint || DEFAULT_OLLAMA_ENDPOINT;

  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];
      return { available: true, models };
    }
    return { available: false, models: [] };
  } catch {
    return { available: false, models: [] };
  }
}
