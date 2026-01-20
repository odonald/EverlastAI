import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '@/lib/storage';
import { type EnrichmentMode, getSystemPrompt } from './index';

export async function enrichWithClaude(
  text: string,
  mode: EnrichmentMode
): Promise<string> {
  const apiKey = await getApiKey('anthropic');

  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = getSystemPrompt(mode);

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  return textContent?.text || text;
}

export async function* streamEnrichWithClaude(
  text: string,
  mode: EnrichmentMode
): AsyncGenerator<string> {
  const apiKey = await getApiKey('anthropic');

  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = getSystemPrompt(mode);

  const stream = await anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
