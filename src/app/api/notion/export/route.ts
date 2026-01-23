import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { formatDuration, formatTimestamp } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { session, accessToken, parentPageId } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'No Notion access token provided' }, { status: 400 });
    }

    if (!session) {
      return NextResponse.json({ error: 'No session data provided' }, { status: 400 });
    }

    const notion = new Client({ auth: accessToken });

    const { transcription, enrichments } = session;

    // Build page content blocks
    const children: BlockObjectRequest[] = [];

    // Metadata callout
    const duration = formatDuration(transcription.metadata.duration);
    const date = new Date(session.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    children.push({
      type: 'callout',
      callout: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `${date}  •  ${duration}  •  ${transcription.speakers.length} speaker${transcription.speakers.length !== 1 ? 's' : ''}  •  ${transcription.metadata.wordCount.toLocaleString()} words`,
            },
          },
        ],
        icon: { type: 'emoji', emoji: '🎙️' },
        color: 'gray_background',
      },
    });

    // Summary
    if (transcription.summary) {
      children.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Summary' } }],
        },
      });

      children.push({
        type: 'quote',
        quote: {
          rich_text: [{ type: 'text', text: { content: transcription.summary } }],
          color: 'yellow_background',
        },
      });
    }

    // Divider
    children.push({ type: 'divider', divider: {} });

    // Transcript heading
    children.push({
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Transcript' } }],
      },
    });

    // Transcript content
    if (transcription.utterances && transcription.utterances.length > 0) {
      // Group consecutive utterances by speaker
      let currentSpeaker: number | null = null;

      for (const utterance of transcription.utterances) {
        if (utterance.speaker !== currentSpeaker) {
          currentSpeaker = utterance.speaker;

          // Speaker label
          children.push({
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: `Speaker ${utterance.speaker + 1}` },
                  annotations: { bold: true, color: getSpeakerColor(utterance.speaker) },
                },
                {
                  type: 'text',
                  text: { content: `  (${formatTimestamp(utterance.start)})` },
                  annotations: { color: 'gray' },
                },
              ],
            },
          });
        }

        // Utterance text
        children.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: utterance.text } }],
          },
        });
      }
    } else {
      // Plain transcript
      const paragraphs = transcription.transcript.split('\n\n');
      for (const para of paragraphs) {
        if (para.trim()) {
          children.push({
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: para } }],
            },
          });
        }
      }
    }

    // Topics
    if (transcription.topics && transcription.topics.length > 0) {
      children.push({ type: 'divider', divider: {} });
      children.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Topics' } }],
        },
      });

      children.push({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: transcription.topics.map((t: { topic: string }, i: number) => ({
            type: 'text' as const,
            text: { content: i === 0 ? t.topic : `, ${t.topic}` },
          })),
        },
      });
    }

    // AI Insights (Enrichments)
    if (enrichments && enrichments.length > 0) {
      children.push({ type: 'divider', divider: {} });
      children.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'AI Insights' } }],
        },
      });

      for (const enrichment of enrichments) {
        const label = getEnrichmentLabel(enrichment.type);

        children.push({
          type: 'toggle',
          toggle: {
            rich_text: [
              {
                type: 'text',
                text: { content: label },
                annotations: { bold: true },
              },
              {
                type: 'text',
                text: { content: ` (via ${enrichment.provider})` },
                annotations: { color: 'gray' },
              },
            ],
            children: [
              {
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: enrichment.content } }],
                },
              },
            ],
          },
        });
      }
    }

    // Create the page
    let pageParent: { type: 'page_id'; page_id: string } | { type: 'workspace'; workspace: true };

    if (parentPageId) {
      pageParent = { type: 'page_id', page_id: parentPageId };
    } else {
      // Search for a page the user has access to
      // Since we can't create at workspace root, we'll return an error if no parent specified
      return NextResponse.json(
        {
          error:
            'Please select a parent page in Notion settings. Notion requires a parent page for new pages.',
        },
        { status: 400 }
      );
    }

    const page = await notion.pages.create({
      parent: pageParent,
      icon: { type: 'emoji', emoji: '🎙️' },
      properties: {
        title: {
          type: 'title',
          title: [{ type: 'text', text: { content: session.title } }],
        },
      },
      children: children.slice(0, 100), // Notion has a limit of 100 blocks per request
    });

    // If there are more blocks, append them
    if (children.length > 100) {
      const remainingBlocks = children.slice(100);
      for (let i = 0; i < remainingBlocks.length; i += 100) {
        const batch = remainingBlocks.slice(i, i + 100);
        await notion.blocks.children.append({
          block_id: page.id,
          children: batch,
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: (page as { url?: string }).url,
      pageId: page.id,
    });
  } catch (error) {
    console.error('Notion export error:', error);
    const message = error instanceof Error ? error.message : 'Failed to export to Notion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getSpeakerColor(
  speaker: number
): 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'default' {
  const colors: Array<'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'default'> = [
    'blue',
    'green',
    'purple',
    'orange',
    'pink',
    'default',
  ];
  return colors[speaker % colors.length];
}

function getEnrichmentLabel(type: string): string {
  const labels: Record<string, string> = {
    summary: '📝 Summary',
    'action-items': '✅ Action Items',
    insights: '💡 Key Insights',
    translate: '🌐 Translation',
    format: '📄 Formatted Text',
    notes: '📓 Notes',
  };
  return labels[type] || type;
}
