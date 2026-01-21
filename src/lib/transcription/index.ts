import { transcribeWithDeepgram } from './deepgram';
import { transcribeWithElevenlabs } from './elevenlabs';
import { transcribeWithWhisper } from './whisper';

export type TranscriptionProvider = 'deepgram' | 'elevenlabs' | 'whisper';

export interface TranscriptionOptions {
  provider: TranscriptionProvider;
  apiKey?: string;
  whisperEndpoint?: string;
}

export async function transcribe(
  audioBlob: Blob,
  provider: TranscriptionProvider,
  apiKeyOrEndpoint?: string
): Promise<string> {
  switch (provider) {
    case 'deepgram':
      return transcribeWithDeepgram(audioBlob, apiKeyOrEndpoint);
    case 'elevenlabs':
      return transcribeWithElevenlabs(audioBlob, apiKeyOrEndpoint);
    case 'whisper':
      return transcribeWithWhisper(audioBlob, apiKeyOrEndpoint);
    default:
      throw new Error(`Unknown transcription provider: ${provider}`);
  }
}
