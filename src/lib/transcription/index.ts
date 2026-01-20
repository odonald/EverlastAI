import { transcribeWithDeepgram } from './deepgram';
import { transcribeWithElevenlabs } from './elevenlabs';

export type TranscriptionProvider = 'deepgram' | 'elevenlabs';

export async function transcribe(
  audioBlob: Blob,
  provider: TranscriptionProvider
): Promise<string> {
  switch (provider) {
    case 'deepgram':
      return transcribeWithDeepgram(audioBlob);
    case 'elevenlabs':
      return transcribeWithElevenlabs(audioBlob);
    default:
      throw new Error(`Unknown transcription provider: ${provider}`);
  }
}
