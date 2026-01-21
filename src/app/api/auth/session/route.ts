import { NextRequest, NextResponse } from 'next/server';

// In-memory store for auth sessions (only for development)
const authSessions = new Map<string, { tokens?: unknown; expiresAt: number; status: 'pending' | 'complete' }>();

// Track the most recent pending session (for browser to pick up)
let latestPendingSessionId: string | null = null;

// Clean up expired sessions
function cleanupExpiredSessions() {
  const now = Date.now();
  authSessions.forEach((value, key) => {
    if (value.expiresAt < now) {
      authSessions.delete(key);
      if (latestPendingSessionId === key) {
        latestPendingSessionId = null;
      }
    }
  });
}

// Store or update auth session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, tokens, action } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    cleanupExpiredSessions();

    if (action === 'start') {
      // Tauri is starting auth - register pending session
      authSessions.set(sessionId, {
        status: 'pending',
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
      });
      latestPendingSessionId = sessionId;
      return NextResponse.json({ success: true });
    }

    if (tokens) {
      // Browser completed auth - store tokens
      const existing = authSessions.get(sessionId);
      if (existing) {
        existing.tokens = tokens;
        existing.status = 'complete';
        authSessions.set(sessionId, existing);
      } else {
        authSessions.set(sessionId, {
          tokens,
          status: 'complete',
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Retrieve auth session or get pending session ID
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  const getPending = request.nextUrl.searchParams.get('getPending');

  cleanupExpiredSessions();

  // Browser asking for the pending session ID
  if (getPending === 'true') {
    if (latestPendingSessionId && authSessions.has(latestPendingSessionId)) {
      const session = authSessions.get(latestPendingSessionId);
      if (session?.status === 'pending') {
        return NextResponse.json({ sessionId: latestPendingSessionId });
      }
    }
    return NextResponse.json({ sessionId: null });
  }

  // Tauri polling for completed session
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const session = authSessions.get(sessionId);

  if (!session || session.status !== 'complete') {
    return NextResponse.json({ found: false });
  }

  // Delete after retrieval (one-time use)
  authSessions.delete(sessionId);
  if (latestPendingSessionId === sessionId) {
    latestPendingSessionId = null;
  }

  return NextResponse.json({ found: true, tokens: session.tokens });
}
