import {
  TranscriptionResult,
  TranscriptionOptions,
  Utterance,
  Word,
  SpeakerInfo,
  Topic,
  SentimentSegment,
  Intent,
  Entity,
  EntityType,
  DEFAULT_TRANSCRIPTION_OPTIONS,
} from '@/types/transcription';

const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

/**
 * Build query parameters for Deepgram API
 */
function buildQueryParams(options: TranscriptionOptions): URLSearchParams {
  const params = new URLSearchParams();

  // Model selection
  params.set('model', options.model || 'nova-2');

  // Core features
  if (options.smartFormat !== false) {
    params.set('smart_format', 'true');
  }

  if (options.diarize !== false) {
    params.set('diarize', 'true');
  }

  if (options.utterances !== false) {
    params.set('utterances', 'true');
  }

  if (options.paragraphs) {
    params.set('paragraphs', 'true');
  }

  // Language handling
  if (options.multilingual) {
    params.set('language', 'multi');
  } else if (options.detectLanguage !== false) {
    params.set('detect_language', 'true');
  } else if (options.language) {
    params.set('language', options.language);
  }

  // Intelligence features (English-focused)
  if (options.summarize) {
    params.set('summarize', 'v2');
  }

  if (options.detectTopics) {
    params.set('topics', 'true');
  }

  if (options.detectSentiment) {
    params.set('sentiment', 'true');
  }

  if (options.detectIntents) {
    params.set('intents', 'true');
  }

  if (options.detectEntities) {
    params.set('detect_entities', 'true');
  }

  // Keywords for custom vocabulary
  if (options.keywords?.length) {
    options.keywords.forEach(kw => params.append('keywords', kw));
  }

  return params;
}

/**
 * Parse Deepgram response into our structured format
 */
function parseDeepgramResponse(
  response: DeepgramResponse,
  options: TranscriptionOptions
): TranscriptionResult {
  const channel = response.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    throw new Error('No transcription result in response');
  }

  // Parse words with speaker info
  const words: Word[] = (alternative.words || []).map((w: DeepgramWord) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
    speaker: w.speaker,
    punctuatedWord: w.punctuated_word,
  }));

  // Parse utterances
  const utterances: Utterance[] = (response.results?.utterances || []).map(
    (u: DeepgramUtterance, index: number) => ({
      id: `utt-${index}`,
      speaker: u.speaker,
      text: u.transcript,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
      words: (u.words || []).map((w: DeepgramWord) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        speaker: w.speaker,
        punctuatedWord: w.punctuated_word,
      })),
    })
  );

  // Calculate speaker info
  const speakerMap = new Map<number, {
    totalTime: number;
    count: number;
    confidenceSum: number;
  }>();

  utterances.forEach(u => {
    const existing = speakerMap.get(u.speaker) || {
      totalTime: 0,
      count: 0,
      confidenceSum: 0,
    };
    existing.totalTime += u.end - u.start;
    existing.count += 1;
    existing.confidenceSum += u.confidence ?? 1;
    speakerMap.set(u.speaker, existing);
  });

  const speakers: SpeakerInfo[] = Array.from(speakerMap.entries()).map(
    ([id, data]) => ({
      id,
      totalSpeakingTime: Math.round(data.totalTime * 100) / 100,
      utteranceCount: data.count,
      averageConfidence: Math.round((data.confidenceSum / data.count) * 100) / 100,
    })
  );

  // Parse topics
  const topics: Topic[] = (response.results?.topics?.segments || []).map(
    (segment: DeepgramTopicSegment) => ({
      topic: segment.topics?.[0]?.topic || 'unknown',
      confidence: segment.topics?.[0]?.confidence || 0,
      segments: [{ start: segment.start_word, end: segment.end_word }],
    })
  );

  // Parse sentiments
  const sentiments: SentimentSegment[] = (response.results?.sentiments?.segments || []).map(
    (s: DeepgramSentimentSegment) => ({
      text: s.text,
      start: s.start,
      end: s.end,
      sentiment: s.sentiment as 'positive' | 'negative' | 'neutral',
      confidence: s.sentiment_score,
      speaker: s.speaker,
    })
  );

  // Add sentiment to utterances
  if (sentiments.length > 0) {
    utterances.forEach(u => {
      const matchingSentiment = sentiments.find(
        s => s.start >= u.start && s.end <= u.end
      );
      if (matchingSentiment) {
        u.sentiment = matchingSentiment.sentiment;
        u.sentimentScore = matchingSentiment.confidence;
      }
    });
  }

  // Parse intents
  const intents: Intent[] = (response.results?.intents?.segments || []).map(
    (i: DeepgramIntentSegment) => ({
      intent: i.intents?.[0]?.intent || 'unknown',
      confidence: i.intents?.[0]?.confidence || 0,
      segment: {
        start: i.start,
        end: i.end,
        text: i.text,
      },
    })
  );

  // Parse entities
  const entities: Entity[] = (response.results?.entities || []).flatMap(
    (e: DeepgramEntity) => ({
      type: mapEntityType(e.label),
      value: e.value,
      confidence: e.confidence,
      start: e.start,
      end: e.end,
    })
  );

  // Get duration from metadata or calculate from utterances
  const duration = response.metadata?.duration ||
    (utterances.length > 0 ? utterances[utterances.length - 1].end : 0);

  // Detected languages
  const detectedLanguage = channel?.detected_language || 'en';
  const languageConfidence = channel?.language_confidence || 1;
  const detectedLanguages = response.results?.channels?.[0]?.languages_detected;

  return {
    transcript: alternative.transcript || '',
    utterances,
    speakers,
    detectedLanguage,
    languageConfidence,
    detectedLanguages,
    summary: response.results?.summary?.short,
    topics: topics.length > 0 ? topics : undefined,
    sentiments: sentiments.length > 0 ? sentiments : undefined,
    intents: intents.length > 0 ? intents : undefined,
    entities: entities.length > 0 ? entities : undefined,
    metadata: {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      duration,
      wordCount: words.length,
      speakerCount: speakers.length,
      provider: 'deepgram',
      model: options.model || 'nova-2',
      channels: response.metadata?.channels,
      sampleRate: response.metadata?.sample_rate,
    },
  };
}

function mapEntityType(label: string): EntityType {
  const mapping: Record<string, EntityType> = {
    PER: 'person',
    PERSON: 'person',
    ORG: 'organization',
    ORGANIZATION: 'organization',
    LOC: 'location',
    LOCATION: 'location',
    GPE: 'location',
    DATE: 'date',
    TIME: 'time',
    MONEY: 'money',
    PERCENT: 'percentage',
    EMAIL: 'email',
    PHONE: 'phone',
    URL: 'url',
  };
  return mapping[label.toUpperCase()] || 'other';
}

/**
 * Transcribe audio with Deepgram - enhanced version with all features
 */
export async function transcribeWithDeepgram(
  audioBlob: Blob,
  apiKey?: string,
  options: Partial<TranscriptionOptions> = {}
): Promise<TranscriptionResult> {
  if (!apiKey) {
    throw new Error('Deepgram API key not configured. Please add your API key in Settings.');
  }

  const mergedOptions: TranscriptionOptions = {
    ...DEFAULT_TRANSCRIPTION_OPTIONS,
    ...options,
    provider: 'deepgram',
  };

  const queryParams = buildQueryParams(mergedOptions);
  const url = `${DEEPGRAM_API_URL}?${queryParams.toString()}`;

  const arrayBuffer = await audioBlob.arrayBuffer();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': audioBlob.type || 'audio/webm',
    },
    body: arrayBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram transcription failed: ${error}`);
  }

  const result: DeepgramResponse = await response.json();
  return parseDeepgramResponse(result, mergedOptions);
}

/**
 * Simple transcription - returns just the text (backward compatible)
 */
export async function transcribeWithDeepgramSimple(
  audioBlob: Blob,
  providedKey?: string
): Promise<string> {
  const result = await transcribeWithDeepgram(audioBlob, providedKey, {
    diarize: false,
    summarize: false,
    detectSentiment: false,
    detectTopics: false,
    detectIntents: false,
    detectEntities: false,
  });
  return result.transcript;
}

/**
 * Validate Deepgram API key
 */
export async function validateDeepgramKey(apiKey: string): Promise<{
  valid: boolean;
  error?: string;
  projectName?: string;
}> {
  try {
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        projectName: data.projects?.[0]?.name,
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

// Deepgram streaming with enhanced features
export interface DeepgramStreamingOptions {
  apiKey: string;
  onTranscript: (text: string, isFinal: boolean, speaker?: number) => void;
  onUtterance?: (utterance: Utterance) => void;
  onError: (error: Error) => void;
  onClose: () => void;
  diarize?: boolean;
  language?: string;
  multilingual?: boolean;
}

export function createDeepgramStream(options: DeepgramStreamingOptions) {
  let socket: WebSocket | null = null;

  const start = async () => {
    const { apiKey } = options;

    if (!apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    const params = new URLSearchParams({
      model: 'nova-2',
      smart_format: 'true',
      interim_results: 'true',
      utterance_end_ms: '1000',
      vad_events: 'true',
    });

    if (options.diarize !== false) {
      params.set('diarize', 'true');
    }

    if (options.multilingual) {
      params.set('language', 'multi');
    } else if (options.language) {
      params.set('language', options.language);
    }

    socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params.toString()}`,
      ['token', apiKey]
    );

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'Results') {
          const alternative = data.channel?.alternatives?.[0];
          const transcript = alternative?.transcript;
          const isFinal = data.is_final;
          const speaker = alternative?.words?.[0]?.speaker;

          if (transcript) {
            options.onTranscript(transcript, isFinal, speaker);
          }
        }

        if (data.type === 'UtteranceEnd' && options.onUtterance) {
          // Handle utterance end event if needed
        }
      } catch (e) {
        console.error('Error parsing Deepgram message:', e);
      }
    };

    socket.onerror = () => {
      options.onError(new Error('WebSocket error'));
    };

    socket.onclose = () => {
      options.onClose();
    };

    return new Promise<void>((resolve, reject) => {
      socket!.onopen = () => resolve();
      socket!.onerror = () => reject(new Error('Failed to connect'));
    });
  };

  const send = (audioData: ArrayBuffer) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(audioData);
    }
  };

  const stop = () => {
    if (socket) {
      socket.close();
      socket = null;
    }
  };

  return { start, send, stop };
}

// Type definitions for Deepgram API response
interface DeepgramResponse {
  metadata?: {
    duration?: number;
    channels?: number;
    sample_rate?: number;
  };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: DeepgramWord[];
      }>;
      detected_language?: string;
      language_confidence?: number;
      languages_detected?: string[];
    }>;
    utterances?: DeepgramUtterance[];
    summary?: { short?: string };
    topics?: { segments?: DeepgramTopicSegment[] };
    sentiments?: { segments?: DeepgramSentimentSegment[] };
    intents?: { segments?: DeepgramIntentSegment[] };
    entities?: DeepgramEntity[];
  };
}

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
}

interface DeepgramUtterance {
  speaker: number;
  transcript: string;
  start: number;
  end: number;
  confidence: number;
  words?: DeepgramWord[];
}

interface DeepgramTopicSegment {
  start_word: number;
  end_word: number;
  topics?: Array<{ topic: string; confidence: number }>;
}

interface DeepgramSentimentSegment {
  text: string;
  start: number;
  end: number;
  sentiment: string;
  sentiment_score: number;
  speaker?: number;
}

interface DeepgramIntentSegment {
  start: number;
  end: number;
  text: string;
  intents?: Array<{ intent: string; confidence: number }>;
}

interface DeepgramEntity {
  label: string;
  value: string;
  confidence: number;
  start: number;
  end: number;
}
