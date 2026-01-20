import { enrichWithOpenAI } from './openai';
import { enrichWithClaude } from './claude';

export type LLMProvider = 'openai' | 'anthropic';
export type EnrichmentMode = 'auto' | 'notes' | 'summary' | 'action-items' | 'format';

export interface EnrichmentOptions {
  provider: LLMProvider;
  mode: EnrichmentMode;
  apiKey?: string;
}

export async function enrich(
  text: string,
  options: EnrichmentOptions
): Promise<string> {
  const { provider, mode, apiKey } = options;

  switch (provider) {
    case 'openai':
      return enrichWithOpenAI(text, mode, apiKey);
    case 'anthropic':
      return enrichWithClaude(text, mode, apiKey);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export function getSystemPrompt(mode: EnrichmentMode): string {
  const prompts: Record<EnrichmentMode, string> = {
    auto: `You are a helpful assistant that processes transcribed speech. Analyze the content and format it appropriately:
- For meeting notes or discussions: Create structured bullet points with key topics
- For ideas or brainstorming: Organize into categories with main points
- For tasks or to-dos: Extract action items with clear descriptions
- For general speech: Clean up the text, fix grammar, and format for readability

Always maintain the original meaning while improving clarity and structure.`,

    notes: `You are a note-taking assistant. Transform the transcribed speech into well-organized structured notes:
- Use clear headings for major topics
- Create bullet points for key information
- Highlight important concepts or decisions
- Keep the notes concise but comprehensive
- Preserve all essential information from the original`,

    summary: `You are a summarization assistant. Create a concise summary of the transcribed speech:
- Capture the main points and key takeaways
- Keep the summary to 2-3 paragraphs maximum
- Focus on the most important information
- Use clear, professional language
- Omit filler words and redundancies`,

    'action-items': `You are a task extraction assistant. Extract all action items from the transcribed speech:
- List each task as a clear, actionable item
- Include any mentioned deadlines or priorities
- Identify who is responsible if mentioned
- Group related tasks together
- Format as a checklist that can be acted upon`,

    format: `You are a text formatting assistant. Clean up the transcribed speech:
- Fix grammar and punctuation errors
- Remove filler words (um, uh, like, you know)
- Break into logical paragraphs
- Maintain the speaker's voice and intent
- Ensure the text reads naturally`,
  };

  return prompts[mode];
}
