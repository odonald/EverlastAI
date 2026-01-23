import { enrichWithOpenAI } from './openai';
import { enrichWithClaude } from './claude';
import { enrichWithOllama } from './ollama';

export type LLMProvider = 'openai' | 'anthropic' | 'ollama';
export type EnrichmentMode = 'auto' | 'notes' | 'summary' | 'action-items' | 'format' | 'translate' | 'insights' | 'cleanup' | 'daily-summary' | 'prompts' | 'custom';

// Supported languages for translation
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
] as const;

export interface EnrichmentOptions {
  provider: LLMProvider;
  mode: EnrichmentMode;
  apiKey?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  targetLanguage?: string; // For translate mode
  customPrompt?: string; // For custom mode
}

export async function enrich(
  text: string,
  options: EnrichmentOptions
): Promise<string> {
  const { provider, mode, apiKey, ollamaEndpoint, ollamaModel, targetLanguage, customPrompt } = options;

  switch (provider) {
    case 'openai':
      return enrichWithOpenAI(text, mode, apiKey, targetLanguage, customPrompt);
    case 'anthropic':
      return enrichWithClaude(text, mode, apiKey, targetLanguage, customPrompt);
    case 'ollama':
      return enrichWithOllama(text, mode, ollamaEndpoint, ollamaModel, targetLanguage, customPrompt);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export async function generateTitle(
  text: string,
  options: Pick<EnrichmentOptions, 'provider' | 'apiKey' | 'ollamaEndpoint' | 'ollamaModel'>
): Promise<string> {
  const { provider, apiKey, ollamaEndpoint, ollamaModel } = options;

  // Use a concise prompt for title generation
  const titlePrompt = `Generate a short, descriptive title (max 50 characters) for this transcript. The title should capture the main topic or theme. Return ONLY the title, no quotes or extra text.

Transcript:
${text.slice(0, 1000)}`;

  switch (provider) {
    case 'openai':
      return enrichWithOpenAI(titlePrompt, 'format', apiKey).then(t => t.slice(0, 60).trim());
    case 'anthropic':
      return enrichWithClaude(titlePrompt, 'format', apiKey).then(t => t.slice(0, 60).trim());
    case 'ollama':
      return enrichWithOllama(titlePrompt, 'format', ollamaEndpoint, ollamaModel).then(t => t.slice(0, 60).trim());
    default:
      // Fallback: use first sentence
      const firstSentence = text.split(/[.!?]/)[0];
      return firstSentence.length <= 50
        ? firstSentence.trim()
        : firstSentence.slice(0, 50).trim() + '...';
  }
}

export function getSystemPrompt(mode: EnrichmentMode, targetLanguage?: string, customPrompt?: string): string {
  if (mode === 'custom' && customPrompt) {
    return `You are a helpful assistant processing a transcript. Follow the user's instruction exactly.

User instruction: ${customPrompt}

Process the transcript according to this instruction. Be thorough and provide useful output.`;
  }

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

    translate: `You are a professional translator. Translate the following text to ${targetLanguage || 'English'}:
- Preserve the meaning and tone of the original text
- Use natural, fluent language appropriate for the target language
- Maintain any speaker attributions (e.g., "Speaker 1:", "John:")
- Keep formatting like bullet points or paragraphs intact
- Do not add any commentary, just provide the translation`,

    insights: `You are an insights extraction assistant. Extract key insights, best practices, and learnings from this transcript:
- Identify key insights and "aha moments"
- Extract best practices or lessons learned
- Note any important decisions or conclusions
- Highlight innovative ideas or approaches
- Summarize wisdom that could be applied elsewhere
- Format as a bulleted list of insights with brief explanations`,

    cleanup: `You are a transcript cleanup assistant. Clean up this voice transcription to make it readable while preserving the conversational flow AND all timestamps.

CRITICAL - PRESERVE TIMESTAMPS:
- Every line MUST keep its timestamp in the exact format provided (e.g., [10:32 AM] or [1:23])
- When combining fragments, use the timestamp from the FIRST fragment
- Never remove or alter timestamps

SENTENCE COMBINING:
- When the SAME speaker has consecutive lines that form an incomplete thought, combine them into one complete sentence
- Example: "[10:32 AM] Speaker 1: Hi I was wondering" + "[10:32 AM] Speaker 1: if we could fix this"
  → "[10:32 AM] Speaker 1: Hi, I was wondering if we could fix this"
- Only combine fragments from the SAME speaker that logically form one sentence
- Keep separate sentences from the same speaker on their own lines if they are complete thoughts

CLEANUP RULES:
- Keep speaker labels (e.g., "Speaker 1:", "John:") exactly as provided
- Fix misheard words using context clues
- Fix grammar, punctuation, and capitalization
- Remove filler words (um, uh, like, you know, so, basically, I mean)
- Fix obvious transcription errors (homophones, similar-sounding wrong words)

PRESERVE:
- ALL timestamps - this is critical
- Speaker labels exactly as given
- The natural back-and-forth conversation flow
- The original meaning - do NOT add, remove, or change what was said

OUTPUT FORMAT:
- [timestamp] Speaker Name: cleaned text
- Each speaker turn on its own line
- Fragmented sentences merged into complete thoughts with first timestamp kept`,

    'daily-summary': `You are a daily briefing assistant. Generate a concise summary of all the recordings from this day.

INPUT: You will receive information about multiple recordings including their titles, previews, and any existing summaries.

OUTPUT FORMAT:
Start with a brief overview (1-2 sentences) of the day's recordings.

Then provide:

**Key Topics:**
- List the main topics discussed across all recordings
- Group related topics together

**Highlights:**
- Important decisions made
- Key insights or learnings
- Action items mentioned (if any)

**Patterns:**
- Any recurring themes or topics
- Notable participants or collaborations

Keep the summary concise but comprehensive. Focus on what's most actionable and memorable from the day. Do not include recording counts or durations - just the content insights.`,

    prompts: `You are an expert prompt engineer. Analyze the transcript and generate useful AI prompts that the user can directly use with AI assistants like ChatGPT, Claude, or others.

INPUT: A transcript of a conversation or voice recording.

OUTPUT FORMAT:
Generate 3-5 practical prompts based on the transcript content. Each prompt should:
1. Be actionable and ready to use
2. Help the user explore or act on the topics discussed
3. Be specific enough to get useful AI responses

Format each prompt as:

**[Category/Purpose]**
\`\`\`
[The actual prompt text that can be copied and used directly]
\`\`\`
_Why this helps: [Brief explanation of what this prompt will achieve]_

---

Categories to consider:
- **Research/Learn More**: Prompts to dive deeper into topics mentioned
- **Take Action**: Prompts to help implement ideas or decisions
- **Clarify/Explain**: Prompts to better understand concepts discussed
- **Create Content**: Prompts to generate related documents, emails, or materials
- **Problem Solve**: Prompts to address challenges mentioned

Make prompts specific to the actual content. Avoid generic prompts. Include relevant context from the transcript in each prompt.`,

    custom: `You are a helpful assistant processing a transcript. Follow the user's instruction provided in the conversation.`,
  };

  return prompts[mode];
}
