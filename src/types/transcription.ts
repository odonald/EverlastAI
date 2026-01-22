/**
 * Enhanced transcription types with full Deepgram feature support
 */

export interface TranscriptionResult {
  // Core transcript
  transcript: string;

  // Structured utterances with speaker info
  utterances: Utterance[];

  // Speaker information
  speakers: SpeakerInfo[];

  // Language detection
  detectedLanguage: string;
  languageConfidence: number;
  detectedLanguages?: string[]; // For multilingual

  // Intelligence features (English only for some)
  summary?: string;
  topics?: Topic[];
  sentiments?: SentimentSegment[];
  intents?: Intent[];
  entities?: Entity[];

  // Metadata
  metadata: TranscriptionMetadata;
}

export interface Utterance {
  id: string;
  speaker: number;
  text: string;
  start: number;  // seconds
  end: number;    // seconds
  confidence?: number;
  words?: Word[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  language?: string;  // Detected language for this utterance
  isFinal?: boolean;  // Whether this is a final transcription
}

export interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuatedWord?: string;
}

export interface SpeakerInfo {
  id: number;
  label?: string;  // User can rename: "Speaker 0" -> "John"
  totalSpeakingTime: number;
  utteranceCount: number;
  averageConfidence: number;
}

export interface Topic {
  topic: string;
  confidence: number;
  segments: { start: number; end: number }[];
}

export interface SentimentSegment {
  text: string;
  start: number;
  end: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  speaker?: number;
}

export interface Intent {
  intent: string;
  confidence: number;
  segment: { start: number; end: number; text: string };
}

export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  start: number;
  end: number;
}

export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'date'
  | 'time'
  | 'money'
  | 'percentage'
  | 'email'
  | 'phone'
  | 'url'
  | 'other';

export interface TranscriptionMetadata {
  id: string;
  createdAt: Date;
  duration: number;      // seconds
  wordCount: number;
  speakerCount: number;
  provider: 'deepgram' | 'elevenlabs' | 'whisper';
  model: string;
  audioFormat?: string;
  sampleRate?: number;
  channels?: number;
}

// Transcription options for the enhanced API
export interface TranscriptionOptions {
  // Provider selection
  provider: 'deepgram' | 'elevenlabs' | 'whisper';
  apiKey?: string;

  // Deepgram-specific options
  model?: 'nova-3' | 'nova-2' | 'nova' | 'enhanced' | 'base';

  // Feature toggles
  diarize?: boolean;           // Speaker identification
  detectLanguage?: boolean;    // Auto language detection
  multilingual?: boolean;      // Code-switching support
  smartFormat?: boolean;       // Punctuation + formatting
  utterances?: boolean;        // Segment by utterances
  paragraphs?: boolean;        // Paragraph formatting

  // Intelligence features (Deepgram)
  summarize?: boolean;
  detectTopics?: boolean;
  detectSentiment?: boolean;
  detectIntents?: boolean;
  detectEntities?: boolean;

  // Language settings
  language?: string;           // BCP-47 code or 'multi'

  // Custom vocabulary
  keywords?: string[];         // Boost recognition of specific terms
}

// Default options for best results
export const DEFAULT_TRANSCRIPTION_OPTIONS: Partial<TranscriptionOptions> = {
  model: 'nova-2',
  diarize: true,
  detectLanguage: true,
  smartFormat: true,
  utterances: true,
  paragraphs: true,
  summarize: true,
  detectSentiment: true,
};

// Session storage types
export interface TranscriptionSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;

  // The transcription result
  transcription: TranscriptionResult;

  // Original audio reference (optional - store path or blob)
  audioPath?: string;

  // Post-processing results
  enrichments?: SessionEnrichment[];

  // User annotations
  notes?: string;
  tags?: string[];
  starred?: boolean;
}

export interface SessionEnrichment {
  id: string;
  type: 'summary' | 'notes' | 'action-items' | 'insights' | 'translate' | 'format' | 'cleanup' | 'custom';
  content: string;
  createdAt: Date;
  provider: string;  // Which LLM was used
  targetLanguage?: string;  // For translate type
}

export interface SessionListItem {
  id: string;
  title: string;
  createdAt: Date;
  duration: number;
  speakerCount: number;
  wordCount: number;
  preview: string;  // First 100 chars
  tags?: string[];
  starred?: boolean;
}
