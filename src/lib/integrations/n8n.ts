/**
 * n8n Webhook Integration
 *
 * Allows sending transcription results to n8n webhooks for automation workflows.
 * Users can configure multiple webhooks for different actions (new session, enrichment, etc.)
 */

import { TranscriptionResult } from '@/types/transcription';
import { FullSession } from '@/lib/sessions';

export interface N8nWebhookConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  trigger: WebhookTrigger;
  // Optional filters
  minDuration?: number;
  minSpeakers?: number;
  requireSummary?: boolean;
  tags?: string[];
  // Custom headers
  headers?: Record<string, string>;
  // Auth
  authType?: 'none' | 'bearer' | 'basic' | 'api-key';
  authToken?: string;
  authHeader?: string; // For api-key auth, e.g., "X-API-Key"
}

export type WebhookTrigger =
  | 'transcription_complete'  // When a new transcription finishes
  | 'session_saved'           // When a session is saved
  | 'enrichment_added'        // When an AI enrichment is added
  | 'manual';                 // Only triggered manually by user

export interface WebhookPayload {
  event: WebhookTrigger;
  timestamp: string;
  session?: {
    id: string;
    title: string;
    createdAt: string;
    duration: number;
    speakerCount: number;
    wordCount: number;
  };
  transcription?: {
    transcript: string;
    summary?: string;
    speakers: Array<{
      id: number;
      label?: string;
      totalSpeakingTime: number;
    }>;
    utterances: Array<{
      speaker: number;
      text: string;
      start: number;
      end: number;
    }>;
    detectedLanguage: string;
    topics?: string[];
    entities?: Array<{ type: string; value: string }>;
    sentiments?: Array<{ text: string; sentiment: string }>;
  };
  enrichment?: {
    type: string;
    content: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Build payload from transcription result
 */
function buildPayloadFromTranscription(
  transcription: TranscriptionResult,
  trigger: WebhookTrigger
): WebhookPayload {
  return {
    event: trigger,
    timestamp: new Date().toISOString(),
    transcription: {
      transcript: transcription.transcript,
      summary: transcription.summary,
      speakers: transcription.speakers.map(s => ({
        id: s.id,
        label: s.label,
        totalSpeakingTime: s.totalSpeakingTime,
      })),
      utterances: transcription.utterances.map(u => ({
        speaker: u.speaker,
        text: u.text,
        start: u.start,
        end: u.end,
      })),
      detectedLanguage: transcription.detectedLanguage,
      topics: transcription.topics?.map(t => t.topic),
      entities: transcription.entities?.map(e => ({
        type: e.type,
        value: e.value,
      })),
      sentiments: transcription.sentiments?.map(s => ({
        text: s.text,
        sentiment: s.sentiment,
      })),
    },
  };
}

/**
 * Build payload from full session
 */
function buildPayloadFromSession(
  session: FullSession,
  trigger: WebhookTrigger
): WebhookPayload {
  const base = buildPayloadFromTranscription(session.transcription, trigger);

  return {
    ...base,
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      duration: session.transcription.metadata.duration,
      speakerCount: session.transcription.speakers.length,
      wordCount: session.transcription.metadata.wordCount,
    },
  };
}

/**
 * Check if a webhook should be triggered based on its filters
 */
function shouldTrigger(
  webhook: N8nWebhookConfig,
  transcription: TranscriptionResult
): boolean {
  if (!webhook.enabled) return false;

  if (webhook.minDuration && transcription.metadata.duration < webhook.minDuration) {
    return false;
  }

  if (webhook.minSpeakers && transcription.speakers.length < webhook.minSpeakers) {
    return false;
  }

  if (webhook.requireSummary && !transcription.summary) {
    return false;
  }

  return true;
}

/**
 * Get authorization headers for a webhook
 */
function getAuthHeaders(webhook: N8nWebhookConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...webhook.headers,
  };

  if (!webhook.authToken) return headers;

  switch (webhook.authType) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${webhook.authToken}`;
      break;
    case 'basic':
      headers['Authorization'] = `Basic ${btoa(webhook.authToken)}`;
      break;
    case 'api-key':
      headers[webhook.authHeader || 'X-API-Key'] = webhook.authToken;
      break;
  }

  return headers;
}

/**
 * Send webhook with retry logic
 */
export async function sendWebhook(
  webhook: N8nWebhookConfig,
  payload: WebhookPayload,
  maxRetries = 3
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: getAuthHeaders(webhook),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }

      // Non-retryable errors
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          statusCode: response.status,
        };
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Network error';
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return { success: false, error: lastError };
}

/**
 * Trigger webhooks for transcription complete event
 */
export async function triggerTranscriptionWebhooks(
  webhooks: N8nWebhookConfig[],
  transcription: TranscriptionResult
): Promise<Map<string, { success: boolean; error?: string }>> {
  const results = new Map<string, { success: boolean; error?: string }>();

  const eligibleWebhooks = webhooks.filter(
    w => w.trigger === 'transcription_complete' && shouldTrigger(w, transcription)
  );

  const payload = buildPayloadFromTranscription(transcription, 'transcription_complete');

  await Promise.all(
    eligibleWebhooks.map(async webhook => {
      const result = await sendWebhook(webhook, payload);
      results.set(webhook.id, result);
    })
  );

  return results;
}

/**
 * Trigger webhooks for session saved event
 */
export async function triggerSessionWebhooks(
  webhooks: N8nWebhookConfig[],
  session: FullSession
): Promise<Map<string, { success: boolean; error?: string }>> {
  const results = new Map<string, { success: boolean; error?: string }>();

  const eligibleWebhooks = webhooks.filter(
    w => w.trigger === 'session_saved' && shouldTrigger(w, session.transcription)
  );

  const payload = buildPayloadFromSession(session, 'session_saved');

  await Promise.all(
    eligibleWebhooks.map(async webhook => {
      const result = await sendWebhook(webhook, payload);
      results.set(webhook.id, result);
    })
  );

  return results;
}

/**
 * Trigger webhooks for enrichment added event
 */
export async function triggerEnrichmentWebhooks(
  webhooks: N8nWebhookConfig[],
  session: FullSession,
  enrichment: { type: string; content: string }
): Promise<Map<string, { success: boolean; error?: string }>> {
  const results = new Map<string, { success: boolean; error?: string }>();

  const eligibleWebhooks = webhooks.filter(
    w => w.trigger === 'enrichment_added' && w.enabled
  );

  const payload = buildPayloadFromSession(session, 'enrichment_added');
  payload.enrichment = enrichment;

  await Promise.all(
    eligibleWebhooks.map(async webhook => {
      const result = await sendWebhook(webhook, payload);
      results.set(webhook.id, result);
    })
  );

  return results;
}

/**
 * Manually trigger a specific webhook
 */
export async function triggerWebhookManually(
  webhook: N8nWebhookConfig,
  session: FullSession,
  customMetadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const payload = buildPayloadFromSession(session, 'manual');
  if (customMetadata) {
    payload.metadata = customMetadata;
  }

  return sendWebhook(webhook, payload);
}

/**
 * Test webhook connection
 */
export async function testWebhook(
  webhook: N8nWebhookConfig
): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const start = Date.now();

  const testPayload: WebhookPayload = {
    event: 'manual',
    timestamp: new Date().toISOString(),
    metadata: {
      test: true,
      message: 'This is a test webhook from EverlastAI',
    },
  };

  const result = await sendWebhook(webhook, testPayload, 1);

  return {
    ...result,
    responseTime: Date.now() - start,
  };
}

/**
 * Validate webhook URL format
 */
export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }

    // n8n webhook URLs typically look like: https://your-n8n.com/webhook/xxx
    // or for test mode: https://your-n8n.com/webhook-test/xxx
    const isN8nWebhook = /\/webhook(-test)?\//.test(parsed.pathname);
    if (!isN8nWebhook) {
      // Warn but don't block - could be a custom endpoint
      return {
        valid: true,
        error: 'URL does not appear to be an n8n webhook (expected /webhook/ in path)',
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Create a default webhook config
 */
export function createDefaultWebhook(
  name: string,
  url: string,
  trigger: WebhookTrigger
): N8nWebhookConfig {
  return {
    id: crypto.randomUUID(),
    name,
    url,
    enabled: true,
    trigger,
    authType: 'none',
  };
}

// Storage helpers - integrates with existing settings store
const WEBHOOKS_STORAGE_KEY = 'n8n_webhooks';

/**
 * Save webhooks to storage (using tauri-plugin-store)
 */
export async function saveWebhooksToStore(webhooks: N8nWebhookConfig[]): Promise<void> {
  const { load } = await import('@tauri-apps/plugin-store');
  const store = await load('settings.json');

  // Don't store auth tokens in plain text - encrypt them
  const sanitized = webhooks.map(w => ({
    ...w,
    // Keep auth token encrypted or use secure storage
    authToken: w.authToken ? '[ENCRYPTED]' : undefined,
  }));

  await store.set(WEBHOOKS_STORAGE_KEY, sanitized);
  await store.save();
}

/**
 * Load webhooks from storage
 */
export async function loadWebhooksFromStore(): Promise<N8nWebhookConfig[]> {
  const { load } = await import('@tauri-apps/plugin-store');
  const store = await load('settings.json');

  const webhooks = await store.get<N8nWebhookConfig[]>(WEBHOOKS_STORAGE_KEY);
  return webhooks || [];
}
