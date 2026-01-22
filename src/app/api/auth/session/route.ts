import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// File-based storage (reliable across processes, unlike in-memory)
const SESSION_DIR = path.join(os.tmpdir(), 'everlast-auth-sessions');

async function ensureDir() {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

async function getPendingSessionFile() {
  return path.join(SESSION_DIR, 'pending.json');
}

async function getTokensFile(sessionId: string) {
  return path.join(SESSION_DIR, `tokens-${sessionId}.json`);
}

// Clean up old files (older than 5 minutes)
async function cleanupOldFiles() {
  try {
    const files = await fs.readdir(SESSION_DIR);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(SESSION_DIR, file);
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > 5 * 60 * 1000) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Store or update auth session
export async function POST(request: NextRequest) {
  try {
    await ensureDir();
    await cleanupOldFiles();

    const body = await request.json();
    const { sessionId, tokens, action } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    if (action === 'start') {
      // Tauri is starting auth - store pending session
      console.log('[API] Starting auth session:', sessionId);
      const pendingFile = await getPendingSessionFile();
      await fs.writeFile(pendingFile, JSON.stringify({ sessionId, timestamp: Date.now() }));
      return NextResponse.json({ success: true });
    }

    if (tokens) {
      // Browser completed auth - store tokens
      console.log('[API] Storing tokens for session:', sessionId);
      const tokensFile = await getTokensFile(sessionId);
      await fs.writeFile(tokensFile, JSON.stringify({ tokens, timestamp: Date.now() }));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (e) {
    console.error('[API] POST error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Retrieve auth session or get pending session ID
export async function GET(request: NextRequest) {
  try {
    await ensureDir();

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const getPending = request.nextUrl.searchParams.get('getPending');

    // Browser asking for the pending session ID
    if (getPending === 'true') {
      try {
        const pendingFile = await getPendingSessionFile();
        const data = JSON.parse(await fs.readFile(pendingFile, 'utf-8'));

        // Check if not expired (5 min)
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          console.log('[API] Found pending session:', data.sessionId);
          return NextResponse.json({ sessionId: data.sessionId });
        }
      } catch {
        // File doesn't exist or is invalid
      }
      console.log('[API] No pending session found');
      return NextResponse.json({ sessionId: null });
    }

    // Tauri polling for completed session
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    try {
      const tokensFile = await getTokensFile(sessionId);
      const data = JSON.parse(await fs.readFile(tokensFile, 'utf-8'));

      // Check if not expired (5 min)
      if (Date.now() - data.timestamp > 5 * 60 * 1000) {
        console.log('[API] Session expired');
        return NextResponse.json({ found: false });
      }

      console.log('[API] Found tokens for session:', sessionId);

      // Delete files after retrieval (one-time use)
      await fs.unlink(tokensFile).catch(() => {});
      await fs.unlink(await getPendingSessionFile()).catch(() => {});

      return NextResponse.json({ found: true, tokens: data.tokens });
    } catch {
      return NextResponse.json({ found: false });
    }
  } catch (e) {
    console.error('[API] GET error:', e);
    return NextResponse.json({ found: false });
  }
}
