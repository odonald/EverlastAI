import { NextRequest, NextResponse } from 'next/server';
import { transcribe } from '@/lib/transcription';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;
    const provider = (formData.get('provider') as string) || 'deepgram';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const validProviders = ['deepgram', 'elevenlabs'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid transcription provider' },
        { status: 400 }
      );
    }

    const text = await transcribe(audioFile, provider as 'deepgram' | 'elevenlabs');

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
