import {
  transcribeWithDeepgram,
  transcribeWithDeepgramSimple,
  createDeepgramStream,
} from './deepgram';
import { transcribeWithElevenlabs } from './elevenlabs';
import { transcribeWithWhisper } from './whisper';
import {
  TranscriptionResult,
  TranscriptionOptions as FullTranscriptionOptions,
  DEFAULT_TRANSCRIPTION_OPTIONS,
} from '@/types/transcription';

// Re-export types
export type { TranscriptionResult, FullTranscriptionOptions };
export { DEFAULT_TRANSCRIPTION_OPTIONS };
export { createDeepgramStream };

export type TranscriptionProvider = 'deepgram' | 'elevenlabs' | 'whisper';

export interface TranscriptionOptions {
  provider: TranscriptionProvider;
  apiKey?: string;
  whisperEndpoint?: string;
}

/**
 * Simple transcription - returns just the text (backward compatible)
 */
export async function transcribe(
  audioBlob: Blob,
  provider: TranscriptionProvider,
  apiKeyOrEndpoint?: string
): Promise<string> {
  switch (provider) {
    case 'deepgram':
      return transcribeWithDeepgramSimple(audioBlob, apiKeyOrEndpoint);
    case 'elevenlabs':
      return transcribeWithElevenlabs(audioBlob, apiKeyOrEndpoint);
    case 'whisper':
      return transcribeWithWhisper(audioBlob, apiKeyOrEndpoint);
    default:
      throw new Error(`Unknown transcription provider: ${provider}`);
  }
}

/**
 * Enhanced transcription - returns full structured result with all Deepgram features
 *
 * Features (when using Deepgram):
 * - Speaker diarization (who said what)
 * - Language detection & multilingual support
 * - Smart formatting (punctuation, capitalization)
 * - Utterance segmentation
 * - Summarization
 * - Sentiment analysis
 * - Topic detection
 * - Intent recognition
 * - Entity extraction
 *
 * For other providers, creates a compatible TranscriptionResult with basic data.
 */
export async function transcribeEnhanced(
  audioBlob: Blob,
  provider: TranscriptionProvider,
  options: Partial<FullTranscriptionOptions> = {},
  apiKeyOrEndpoint?: string
): Promise<TranscriptionResult> {
  switch (provider) {
    case 'deepgram':
      return transcribeWithDeepgram(audioBlob, apiKeyOrEndpoint, options);

    case 'elevenlabs':
    case 'whisper': {
      // For non-Deepgram providers, get simple text and wrap in result
      const text =
        provider === 'elevenlabs'
          ? await transcribeWithElevenlabs(audioBlob, apiKeyOrEndpoint)
          : await transcribeWithWhisper(audioBlob, apiKeyOrEndpoint);

      return createBasicResult(text, provider);
    }

    default:
      throw new Error(`Unknown transcription provider: ${provider}`);
  }
}

/**
 * Create a basic TranscriptionResult from simple text
 * Used for providers that don't support enhanced features
 */
function createBasicResult(text: string, provider: TranscriptionProvider): TranscriptionResult {
  // Split text into sentences as pseudo-utterances
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  const utterances = sentences.map((sentence, index) => ({
    id: `utt-${index}`,
    speaker: 0,
    text: sentence.trim(),
    start: 0,
    end: 0,
    confidence: 1,
    words: [],
  }));

  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  return {
    transcript: text,
    utterances,
    speakers: [
      {
        id: 0,
        totalSpeakingTime: 0,
        utteranceCount: utterances.length,
        averageConfidence: 1,
      },
    ],
    detectedLanguage: 'en',
    languageConfidence: 1,
    metadata: {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      duration: 0,
      wordCount,
      speakerCount: 1,
      provider,
      model: provider === 'elevenlabs' ? 'scribe_v1' : 'whisper',
    },
  };
}
