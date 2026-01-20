import OpenAI from 'openai';
import { getApiKey } from '@/lib/storage';
import { type EnrichmentMode, getSystemPrompt } from './index';

export async function enrichWithOpenAI(
  text: string,
  mode: EnrichmentMode
): Promise<string> {
  const apiKey = await getApiKey('openai');

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const systemPrompt = getSystemPrompt(mode);

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || text;
}

export async function* streamEnrichWithOpenAI(
  text: string,
  mode: EnrichmentMode
): AsyncGenerator<string> {
  const apiKey = await getApiKey('openai');

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const systemPrompt = getSystemPrompt(mode);

  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
