import OpenAI from 'openai';
import { type EnrichmentMode, getSystemPrompt } from './index';

export async function enrichWithOpenAI(
  text: string,
  mode: EnrichmentMode,
  apiKey?: string,
  targetLanguage?: string,
  customPrompt?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const systemPrompt = getSystemPrompt(mode, targetLanguage, customPrompt);

  const response = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    max_completion_tokens: 4000,
  });

  return response.choices[0]?.message?.content || text;
}
