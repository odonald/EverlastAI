import { NextRequest, NextResponse } from 'next/server';

const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;
    const provider = (formData.get('provider') as string) || 'deepgram';
    const apiKey = formData.get('apiKey') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const validProviders = ['deepgram', 'elevenlabs', 'whisper'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Invalid transcription provider' }, { status: 400 });
    }

    let text = '';

    if (provider === 'deepgram') {
      // Call Deepgram API server-side to avoid CORS
      const params = new URLSearchParams({
        model: 'nova-2',
        smart_format: 'true',
        detect_language: 'true',
      });

      const arrayBuffer = await audioFile.arrayBuffer();

      const response = await fetch(`${DEEPGRAM_API_URL}?${params}`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': audioFile.type || 'audio/webm',
        },
        body: arrayBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Deepgram error:', errorText);
        return NextResponse.json(
          { error: `Transcription failed: ${response.status}` },
          { status: response.status }
        );
      }

      const result = await response.json();
      text = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    } else if (provider === 'elevenlabs') {
      // ElevenLabs transcription
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64,
          model_id: 'scribe_v1',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs error:', errorText);
        return NextResponse.json(
          { error: `Transcription failed: ${response.status}` },
          { status: response.status }
        );
      }

      const result = await response.json();
      text = result.text || '';
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
