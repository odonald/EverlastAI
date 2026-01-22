/**
 * Session storage service - interfaces with Tauri backend for secure session persistence
 */

import { invoke } from '@tauri-apps/api/core';
import { TranscriptionResult, TranscriptionSession, SessionEnrichment } from '@/types/transcription';

export interface SessionListItem {
  id: string;
  title: string;
  created_at: string;
  duration: number;
  speaker_count: number;
  word_count: number;
  preview: string;
  tags?: string[];
  starred?: boolean;
}

export interface FullSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  transcription: TranscriptionResult;
  audioPath?: string;
  enrichments?: SessionEnrichment[];
  notes?: string;
  tags?: string[];
  starred?: boolean;
}

/**
 * List all sessions for the current user
 */
export async function listSessions(userId?: string): Promise<SessionListItem[]> {
  try {
    const sessions = await invoke<SessionListItem[]>('list_sessions', {
      userId: userId || null,
    });
    return sessions;
  } catch (error) {
    console.error('Failed to list sessions:', error);
    throw error;
  }
}

/**
 * Save a new session or update existing
 */
export async function saveSession(
  session: FullSession,
  userId?: string
): Promise<void> {
  try {
    const listItem: SessionListItem = {
      id: session.id,
      title: session.title,
      created_at: session.createdAt,
      duration: session.transcription.metadata.duration,
      speaker_count: session.transcription.speakers.length,
      word_count: session.transcription.metadata.wordCount,
      preview: session.transcription.transcript.slice(0, 150),
      tags: session.tags,
      starred: session.starred,
    };

    await invoke('save_session', {
      userId: userId || null,
      sessionId: session.id,
      sessionData: JSON.stringify(session),
      listItem,
    });
  } catch (error) {
    console.error('Failed to save session:', error);
    throw error;
  }
}

/**
 * Get a full session by ID
 */
export async function getSession(
  sessionId: string,
  userId?: string
): Promise<FullSession> {
  try {
    const sessionData = await invoke<string>('get_session', {
      userId: userId || null,
      sessionId,
    });
    return JSON.parse(sessionData) as FullSession;
  } catch (error) {
    console.error('Failed to get session:', error);
    throw error;
  }
}

/**
 * Delete a session
 */
export async function deleteSession(
  sessionId: string,
  userId?: string
): Promise<void> {
  try {
    await invoke('delete_session', {
      userId: userId || null,
      sessionId,
    });
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
}

/**
 * Update session metadata (title, tags, starred)
 */
export async function updateSessionMetadata(
  sessionId: string,
  updates: {
    title?: string;
    tags?: string[];
    starred?: boolean;
  },
  userId?: string
): Promise<void> {
  try {
    await invoke('update_session_metadata', {
      userId: userId || null,
      sessionId,
      title: updates.title || null,
      tags: updates.tags || null,
      starred: updates.starred ?? null,
    });
  } catch (error) {
    console.error('Failed to update session metadata:', error);
    throw error;
  }
}

/**
 * Create a new session from a transcription result
 */
export function createSessionFromTranscription(
  transcription: TranscriptionResult,
  title?: string
): FullSession {
  const now = new Date().toISOString();

  // Auto-generate title from first few words if not provided
  const autoTitle = title || generateTitle(transcription.transcript);

  return {
    id: transcription.metadata.id,
    title: autoTitle,
    createdAt: now,
    updatedAt: now,
    transcription,
    tags: [],
    starred: false,
  };
}

/**
 * Generate a title from transcript text
 */
function generateTitle(transcript: string): string {
  // Take first sentence or first 50 chars
  const firstSentence = transcript.split(/[.!?]/)[0];
  if (firstSentence.length <= 50) {
    return firstSentence.trim();
  }

  // Cut at word boundary
  const shortened = transcript.slice(0, 50);
  const lastSpace = shortened.lastIndexOf(' ');
  if (lastSpace > 30) {
    return shortened.slice(0, lastSpace) + '...';
  }

  return shortened + '...';
}

/**
 * Add an enrichment to a session
 */
export async function addEnrichmentToSession(
  sessionId: string,
  enrichment: Omit<SessionEnrichment, 'id' | 'createdAt'>,
  userId?: string
): Promise<SessionEnrichment> {
  const session = await getSession(sessionId, userId);

  const newEnrichment: SessionEnrichment = {
    id: crypto.randomUUID(),
    createdAt: new Date(),
    ...enrichment,
  };

  session.enrichments = session.enrichments || [];
  session.enrichments.push(newEnrichment);
  session.updatedAt = new Date().toISOString();

  await saveSession(session, userId);
  return newEnrichment;
}

/**
 * Delete an enrichment from a session
 */
export async function deleteEnrichmentFromSession(
  sessionId: string,
  enrichmentId: string,
  userId?: string
): Promise<void> {
  const session = await getSession(sessionId, userId);

  session.enrichments = (session.enrichments || []).filter(e => e.id !== enrichmentId);
  session.updatedAt = new Date().toISOString();

  await saveSession(session, userId);
}

/**
 * Update speaker name in a session
 */
export async function updateSpeakerName(
  sessionId: string,
  speakerId: number,
  name: string,
  userId?: string
): Promise<FullSession> {
  const session = await getSession(sessionId, userId);

  // Find the speaker and update their label
  const speaker = session.transcription.speakers.find(s => s.id === speakerId);
  if (speaker) {
    speaker.label = name.trim() || undefined; // Clear if empty
  }

  session.updatedAt = new Date().toISOString();
  await saveSession(session, userId);
  return session;
}

