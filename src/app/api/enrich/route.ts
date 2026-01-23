import { NextRequest, NextResponse } from 'next/server';
import { enrich } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { text, provider = 'openai', mode = 'auto' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const enrichedText = await enrich(text, { provider, mode });

    return NextResponse.json({ enrichedText });
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json({ error: 'Failed to enrich text' }, { status: 500 });
  }
}
