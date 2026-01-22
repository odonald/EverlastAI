import { NextRequest, NextResponse } from 'next/server';

// Notion OAuth configuration
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/notion/callback';

// Use POST to avoid static export issues with searchParams
export async function POST(request: NextRequest) {
  if (!NOTION_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Notion OAuth not configured. Set NOTION_CLIENT_ID in environment.' },
      { status: 500 }
    );
  }

  // Get sessionId from request body
  const body = await request.json().catch(() => ({}));
  const sessionId = body.sessionId || crypto.randomUUID();

  // Generate CSRF token
  const csrfToken = crypto.randomUUID();

  // Combine sessionId and CSRF token in state (separated by colon)
  const state = `${sessionId}:${csrfToken}`;

  // Build Notion OAuth URL
  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
  authUrl.searchParams.set('client_id', NOTION_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('owner', 'user');
  authUrl.searchParams.set('redirect_uri', NOTION_REDIRECT_URI);
  authUrl.searchParams.set('state', state);

  // Return the auth URL and set CSRF cookie
  const response = NextResponse.json({
    authUrl: authUrl.toString(),
    sessionId,
  });

  // Set state cookie for CSRF verification (only the CSRF token part)
  response.cookies.set('notion_oauth_state', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
