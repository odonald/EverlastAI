import { transcribeWithDeepgram } from './deepgram';
import { transcribeWithElevenlabs } from './elevenlabs';

export type TranscriptionProvider = 'deepgram' | 'elevenlabs';

export async function transcribe(
  audioBlob: Blob,
  provider: TranscriptionProvider,
  apiKey?: string
): Promise<string> {
  switch (provider) {
    case 'deepgram':
      return transcribeWithDeepgram(audioBlob, apiKey);
    case 'elevenlabs':
      return transcribeWithElevenlabs(audioBlob, apiKey);
    default:
      throw new Error(`Unknown transcription provider: ${provider}`);
  }
}
