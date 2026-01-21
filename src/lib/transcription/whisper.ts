/**
 * Local Whisper transcription
 * Works with various Whisper server implementations:
 * - faster-whisper-server
 * - whisper.cpp server
 * - LocalAI
 * - Any OpenAI-compatible whisper endpoint
 */

const DEFAULT_WHISPER_ENDPOINT = 'http://localhost:8080';

export async function transcribeWithWhisper(
  audioBlob: Blob,
  endpoint?: string
): Promise<string> {
  const baseUrl = endpoint || DEFAULT_WHISPER_ENDPOINT;

  // Convert blob to file for FormData
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1'); // For OpenAI-compatible endpoints
  formData.append('response_format', 'json');

  // Try OpenAI-compatible endpoint first (/v1/audio/transcriptions)
  try {
    const response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.text || '';
    }
  } catch {
    // OpenAI-compatible endpoint failed, try alternative
  }

  // Try simple /transcribe endpoint (common for whisper.cpp servers)
  try {
    const response = await fetch(`${baseUrl}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.text || data.transcription || '';
    }
  } catch {
    // Simple /transcribe endpoint failed, try /inference
  }

  // Try /inference endpoint (whisper.cpp default)
  try {
    const response = await fetch(`${baseUrl}/inference`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.text || '';
    }
  } catch {
    // Fall through to error
  }

  throw new Error(
    `Failed to connect to Whisper server at ${baseUrl}. ` +
    'Make sure you have a local Whisper server running. ' +
    'You can use: faster-whisper-server, whisper.cpp, or LocalAI.'
  );
}
