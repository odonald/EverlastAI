import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { provider, key } = await request.json();

    if (!provider || !key) {
      return NextResponse.json(
        { valid: false, error: 'Missing provider or key' },
        { status: 400 }
      );
    }

    let result: { valid: boolean; error?: string; info?: Record<string, unknown> };

    switch (provider) {
      case 'deepgram':
        result = await validateDeepgram(key);
        break;
      case 'openai':
        result = await validateOpenAI(key);
        break;
      case 'anthropic':
        result = await validateAnthropic(key);
        break;
      case 'elevenlabs':
        result = await validateElevenLabs(key);
        break;
      default:
        return NextResponse.json(
          { valid: false, error: 'Unknown provider' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation request failed' },
      { status: 500 }
    );
  }
}

async function validateDeepgram(apiKey: string) {
  try {
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { 'Authorization': `Token ${apiKey}` },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        info: { projectName: data.projects?.[0]?.name },
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

async function validateOpenAI(apiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 429) {
      return { valid: true, info: { rateLimited: true } };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `API error: ${response.status}`,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

async function validateAnthropic(apiKey: string) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 400 || response.status === 429) {
      // Bad request or rate limited but authenticated
      return { valid: true, info: { rateLimited: response.status === 429 } };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `API error: ${response.status}`,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

async function validateElevenLabs(apiKey: string) {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        info: {
          subscription: data.subscription?.tier,
          characterCount: data.subscription?.character_count,
          characterLimit: data.subscription?.character_limit,
        },
      };
    }

    if (response.status === 401) {
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
