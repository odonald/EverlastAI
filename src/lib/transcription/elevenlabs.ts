import { getApiKey } from '@/lib/storage';

export async function transcribeWithElevenlabs(audioBlob: Blob, providedKey?: string): Promise<string> {
  const apiKey = providedKey || await getApiKey('elevenlabs');

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured. Please add your API key in Settings.');
  }

  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: base64,
      model_id: 'scribe_v1',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs transcription failed: ${error}`);
  }

  const result = await response.json();

  return result.text || '';
}
