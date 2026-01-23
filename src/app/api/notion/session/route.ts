import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';

// Store Notion tokens temporarily in a file (similar to Auth0 session pattern)
// This allows cross-context communication between external browser and Tauri app

const SESSION_DIR = path.join(os.tmpdir(), 'everlast-notion-sessions');

function getSessionPath(sessionId: string): string {
  // Sanitize sessionId to prevent path traversal
  const sanitized = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
  return path.join(SESSION_DIR, `${sanitized}.json`);
}

// POST - Store token data (called from callback)
export async function POST(request: NextRequest) {
  try {
    const { sessionId, tokenData } = await request.json();

    if (!sessionId || !tokenData) {
      return NextResponse.json({ error: 'Missing sessionId or tokenData' }, { status: 400 });
    }

    // Ensure session directory exists
    if (!existsSync(SESSION_DIR)) {
      await mkdir(SESSION_DIR, { recursive: true });
    }

    const sessionPath = getSessionPath(sessionId);

    // Store with expiry (5 minutes)
    const sessionData = {
      tokenData,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    await writeFile(sessionPath, JSON.stringify(sessionData), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to store Notion session:', error);
    return NextResponse.json({ error: 'Failed to store session' }, { status: 500 });
  }
}

// GET - Retrieve token data (called from app polling)
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const sessionPath = getSessionPath(sessionId);

    if (!existsSync(sessionPath)) {
      return NextResponse.json({ found: false });
    }

    const fileContent = await readFile(sessionPath, 'utf-8');
    const sessionData = JSON.parse(fileContent);

    // Check if expired
    if (Date.now() > sessionData.expiresAt) {
      // Clean up expired session
      await unlink(sessionPath).catch(() => {});
      return NextResponse.json({ found: false, expired: true });
    }

    return NextResponse.json({
      found: true,
      tokenData: sessionData.tokenData,
    });
  } catch (error) {
    console.error('Failed to retrieve Notion session:', error);
    return NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}

// DELETE - Clear token data (called after app retrieves it)
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const sessionPath = getSessionPath(sessionId);

    if (existsSync(sessionPath)) {
      await unlink(sessionPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete Notion session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
