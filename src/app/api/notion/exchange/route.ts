import { NextRequest, NextResponse } from 'next/server';

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET;
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/notion/callback';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code, state } = body;

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code provided' },
      { status: 400 }
    );
  }

  // Parse state to get sessionId and CSRF token
  const [sessionId, csrfToken] = (state || '').split(':');

  // Verify CSRF token
  const storedCsrfToken = request.cookies.get('notion_oauth_state')?.value;
  if (!storedCsrfToken || storedCsrfToken !== csrfToken) {
    return NextResponse.json(
      { error: 'Invalid state parameter. Please try again.' },
      { status: 400 }
    );
  }

  if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Notion OAuth not configured' },
      { status: 500 }
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: NOTION_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Notion token exchange failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to connect to Notion. Please try again.' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Store token in server-side session for cross-context retrieval
    const tokenPayload = {
      access_token: tokenData.access_token,
      workspace_id: tokenData.workspace_id,
      workspace_name: tokenData.workspace_name,
      workspace_icon: tokenData.workspace_icon,
      bot_id: tokenData.bot_id,
    };

    // Store via session API (for Tauri app to retrieve)
    if (sessionId) {
      try {
        // Get origin from referer or default to localhost
        const origin = request.headers.get('origin') || 'http://localhost:3000';
        await fetch(`${origin}/api/notion/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, tokenData: tokenPayload }),
        });
      } catch (e) {
        console.error('Failed to store session:', e);
      }
    }

    // Return success with token data
    const response = NextResponse.json({
      success: true,
      workspaceName: tokenData.workspace_name,
      workspaceId: tokenData.workspace_id,
    });

    // Also set cookie as backup for same-context flows
    response.cookies.set('notion_token_data', JSON.stringify(tokenPayload), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });

    // Clear the state cookie
    response.cookies.delete('notion_oauth_state');

    return response;
  } catch (error) {
    console.error('Notion OAuth exchange error:', error);
    return NextResponse.json(
      { error: 'An error occurred during authorization. Please try again.' },
      { status: 500 }
    );
  }
}
