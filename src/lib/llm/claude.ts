import Anthropic from '@anthropic-ai/sdk';
import { type EnrichmentMode, getSystemPrompt } from './index';

export async function enrichWithClaude(
  text: string,
  mode: EnrichmentMode,
  apiKey?: string,
  targetLanguage?: string,
  customPrompt?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please add your API key in Settings.');
  }

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const systemPrompt = getSystemPrompt(mode, targetLanguage, customPrompt);

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  return textContent?.text || text;
}
