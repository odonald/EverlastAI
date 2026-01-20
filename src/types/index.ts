// API Key types
export type ApiKeyType = 'deepgram' | 'elevenlabs' | 'openai' | 'anthropic';

// Transcription types
export type TranscriptionProvider = 'deepgram' | 'elevenlabs';

// LLM types
export type LLMProvider = 'openai' | 'anthropic';
export type EnrichmentMode = 'auto' | 'notes' | 'summary' | 'action-items' | 'format';

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// Settings types
export interface ApiKeys {
  deepgram: string;
  elevenlabs: string;
  openai: string;
  anthropic: string;
}

export interface Settings {
  apiKeys: ApiKeys;
  transcriptionProvider: TranscriptionProvider;
  llmProvider: LLMProvider;
  enrichmentMode: EnrichmentMode;
  hotkey: string;
}

// Recording state
export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'enriching';

// API response types
export interface TranscriptionResponse {
  text: string;
}

export interface EnrichmentResponse {
  enrichedText: string;
}

export interface ErrorResponse {
  error: string;
}
