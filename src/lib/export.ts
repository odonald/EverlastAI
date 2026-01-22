'use client';

import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { FullSession } from '@/lib/sessions';
import { formatDuration, formatTimestamp } from '@/lib/utils';

// ============================================================================
// PDF Export
// ============================================================================

interface PDFOptions {
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeMetadata?: boolean;
  includeEnrichments?: boolean;
  includeTabs?: string[]; // Array of tab IDs to include ('transcript' or enrichment IDs)
}

export async function exportToPDF(
  session: FullSession,
  options: PDFOptions = {}
): Promise<void> {
  const {
    includeMetadata = true,
    includeTabs,
  } = options;

  // If includeTabs is provided, use it to determine what to include
  const includeTranscript = includeTabs ? includeTabs.includes('transcript') : (options.includeTranscript ?? true);
  const includeSummary = includeTabs ? includeTabs.includes('transcript') : (options.includeSummary ?? true);

  // Filter enrichments based on includeTabs
  const enrichmentsToInclude = includeTabs
    ? (session.enrichments || []).filter(e => includeTabs.includes(e.id))
    : (options.includeEnrichments !== false ? (session.enrichments || []) : []);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Helper functions
  const addText = (text: string, fontSize: number, isBold = false, color: [number, number, number] = [30, 30, 30]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);

    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.5;

    lines.forEach((line: string) => {
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    return lines.length * lineHeight;
  };

  const addSpacer = (height: number) => {
    yPosition += height;
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Title
  addText(session.title, 24, true, [20, 20, 20]);
  addSpacer(4);

  // Metadata
  if (includeMetadata) {
    const { transcription } = session;
    const date = new Date(session.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');

    const metadataText = `${date}  •  ${formatDuration(transcription.metadata.duration)}  •  ${transcription.speakers.length} speaker${transcription.speakers.length !== 1 ? 's' : ''}  •  ${transcription.metadata.wordCount.toLocaleString()} words`;
    doc.text(metadataText, margin, yPosition);
    yPosition += 6;

    // Horizontal line
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    addSpacer(8);
  }

  // Summary
  if (includeSummary && session.transcription.summary) {
    addText('Summary', 14, true, [180, 120, 50]);
    addSpacer(3);
    addText(session.transcription.summary, 11, false, [60, 60, 60]);
    addSpacer(8);
  }

  // Transcript
  if (includeTranscript) {
    addText('Transcript', 14, true, [50, 100, 150]);
    addSpacer(4);

    const { utterances, transcript, speakers } = session.transcription;

    if (utterances.length > 0) {
      utterances.forEach((utterance) => {
        // Get speaker name (custom label or default)
        const speaker = speakers.find(s => s.id === utterance.speaker);
        const speakerName = speaker?.label || `Speaker ${utterance.speaker + 1}`;
        const actualTime = formatActualTime(session.createdAt, utterance.start);

        // Speaker label with actual time
        addText(`${speakerName}  [${actualTime}]`, 9, true, [100, 100, 100]);
        addSpacer(1);
        // Text
        addText(utterance.text, 11, false, [40, 40, 40]);
        addSpacer(4);
      });
    } else {
      addText(transcript, 11, false, [40, 40, 40]);
    }
  }

  // Enrichments
  if (enrichmentsToInclude.length > 0) {
    addSpacer(8);
    addText('AI Insights', 14, true, [120, 80, 160]);
    addSpacer(4);

    enrichmentsToInclude.forEach((enrichment) => {
      const label = getEnrichmentLabel(enrichment.type);
      addText(label, 11, true, [80, 80, 80]);
      addSpacer(2);
      addText(enrichment.content, 10, false, [60, 60, 60]);
      addSpacer(6);
    });
  }

  // Footer on each page
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}  •  Generated by EverlastAI`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Download
  const filename = `${session.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(filename);
}

// ============================================================================
// Email Export (mailto)
// ============================================================================

interface EmailOptions {
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeMetadata?: boolean;
}

export function exportToEmail(
  session: FullSession,
  options: EmailOptions = {}
): void {
  const {
    includeTranscript = true,
    includeSummary = true,
    includeMetadata = true,
  } = options;

  const { transcription } = session;
  const lines: string[] = [];

  // Subject
  const subject = encodeURIComponent(`Transcript: ${session.title}`);

  // Body
  lines.push(session.title);
  lines.push('');

  if (includeMetadata) {
    const date = new Date(session.createdAt).toLocaleDateString();
    lines.push(`Date: ${date}`);
    lines.push(`Duration: ${formatDuration(transcription.metadata.duration)}`);
    lines.push(`Speakers: ${transcription.speakers.length}`);
    lines.push(`Words: ${transcription.metadata.wordCount}`);
    lines.push('');
  }

  if (includeSummary && transcription.summary) {
    lines.push('--- SUMMARY ---');
    lines.push('');
    lines.push(transcription.summary);
    lines.push('');
  }

  if (includeTranscript) {
    lines.push('--- TRANSCRIPT ---');
    lines.push('');

    if (transcription.utterances.length > 0) {
      transcription.utterances.forEach((u) => {
        // Get speaker name (custom label or default)
        const speaker = transcription.speakers.find(s => s.id === u.speaker);
        const speakerName = speaker?.label || `Speaker ${u.speaker + 1}`;
        const actualTime = formatActualTime(session.createdAt, u.start);
        lines.push(`[${actualTime}] ${speakerName}: ${u.text}`);
      });
    } else {
      lines.push(transcription.transcript);
    }
  }

  const body = encodeURIComponent(lines.join('\n'));

  // Open mailto link (max ~2000 chars for URL, truncate if needed)
  const mailto = `mailto:?subject=${subject}&body=${body}`.slice(0, 2000);
  window.open(mailto, '_self');
}

// ============================================================================
// Webhook Export
// ============================================================================

interface WebhookPayload {
  session_id: string;
  title: string;
  created_at: string;
  duration_seconds: number;
  word_count: number;
  speaker_count: number;
  language: string;
  transcript: string;
  speakers: Array<{
    id: number;
    name: string;
  }>;
  utterances: Array<{
    speaker: number;
    speaker_name: string;
    text: string;
    start: number;
    end: number;
  }>;
  summary?: string;
  topics?: string[];
  entities?: Array<{ type: string; value: string }>;
  enrichments?: Array<{
    type: string;
    content: string;
    provider: string;
    created_at: string;
  }>;
}

export async function exportToWebhook(
  session: FullSession,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  const { transcription } = session;

  const payload: WebhookPayload = {
    session_id: session.id,
    title: session.title,
    created_at: session.createdAt,
    duration_seconds: transcription.metadata.duration,
    word_count: transcription.metadata.wordCount,
    speaker_count: transcription.speakers.length,
    language: transcription.detectedLanguage,
    transcript: transcription.transcript,
    speakers: transcription.speakers.map((s) => ({
      id: s.id,
      name: s.label || `Speaker ${s.id + 1}`,
    })),
    utterances: transcription.utterances.map((u) => {
      const speaker = transcription.speakers.find(s => s.id === u.speaker);
      return {
        speaker: u.speaker,
        speaker_name: speaker?.label || `Speaker ${u.speaker + 1}`,
        text: u.text,
        start: u.start,
        end: u.end,
      };
    }),
    summary: transcription.summary,
    topics: transcription.topics?.map((t) => t.topic),
    entities: transcription.entities?.map((e) => ({
      type: e.type,
      value: e.value,
    })),
    enrichments: session.enrichments?.map((e) => ({
      type: e.type,
      content: e.content,
      provider: e.provider,
      created_at: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
    })),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send to webhook',
    };
  }
}

// ============================================================================
// Notion Export
// ============================================================================

interface NotionExportOptions {
  accessToken: string;
  parentPageId?: string; // If provided, creates a subpage; otherwise creates in workspace
}

export async function exportToNotion(
  session: FullSession,
  options: NotionExportOptions
): Promise<{ success: boolean; pageUrl?: string; error?: string }> {
  try {
    const response = await fetch('/api/notion/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session,
        accessToken: options.accessToken,
        parentPageId: options.parentPageId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to export to Notion');
    }

    return {
      success: true,
      pageUrl: result.url,
    };
  } catch (error) {
    console.error('Notion export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export to Notion',
    };
  }
}

// ============================================================================
// Text Export (.txt)
// ============================================================================

export function exportToTxt(
  session: FullSession,
  cleanedTranscript?: string
): void {
  const { transcription } = session;
  const lines: string[] = [];

  // Title
  lines.push(session.title);
  lines.push('='.repeat(session.title.length));
  lines.push('');

  // Metadata
  const date = new Date(session.createdAt).toLocaleString();
  lines.push(`Date: ${date}`);
  lines.push(`Duration: ${formatDuration(transcription.metadata.duration)}`);
  lines.push(`Speakers: ${transcription.speakers.length}`);
  lines.push(`Words: ${transcription.metadata.wordCount}`);
  lines.push('');
  lines.push('-'.repeat(50));
  lines.push('');

  // Summary if available
  if (transcription.summary) {
    lines.push('SUMMARY');
    lines.push('-'.repeat(7));
    lines.push(transcription.summary);
    lines.push('');
    lines.push('-'.repeat(50));
    lines.push('');
  }

  // Transcript
  lines.push('TRANSCRIPT');
  lines.push('-'.repeat(10));
  lines.push('');

  if (cleanedTranscript) {
    // Use cleaned transcript if provided
    lines.push(cleanedTranscript);
  } else if (transcription.utterances.length > 0) {
    // Calculate actual timestamps
    const sessionStart = new Date(session.createdAt);

    transcription.utterances.forEach((u) => {
      const speaker = transcription.speakers.find(s => s.id === u.speaker);
      const speakerName = speaker?.label || `Speaker ${u.speaker + 1}`;
      const actualTime = new Date(sessionStart.getTime() + u.start * 1000);
      const timeStr = actualTime.toLocaleTimeString();
      lines.push(`[${timeStr}] ${speakerName}: ${u.text}`);
    });
  } else {
    lines.push(transcription.transcript);
  }

  lines.push('');
  lines.push('-'.repeat(50));
  lines.push('Generated by EverlastAI');

  // Download
  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const filename = `${session.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
  saveAs(blob, filename);
}

// ============================================================================
// Word Document Export (.docx)
// ============================================================================

interface DocxOptions {
  cleanedTranscript?: string;
  includeTabs?: string[];
}

export async function exportToDocx(
  session: FullSession,
  cleanedTranscriptOrOptions?: string | DocxOptions
): Promise<void> {
  // Handle both old signature (string) and new signature (options object)
  const options: DocxOptions = typeof cleanedTranscriptOrOptions === 'string'
    ? { cleanedTranscript: cleanedTranscriptOrOptions }
    : (cleanedTranscriptOrOptions || {});

  const { cleanedTranscript, includeTabs } = options;

  // Filter enrichments based on includeTabs
  const enrichmentsToInclude = includeTabs
    ? (session.enrichments || []).filter(e => includeTabs.includes(e.id))
    : (session.enrichments || []);

  const includeTranscript = includeTabs ? includeTabs.includes('transcript') : true;
  const { transcription } = session;
  const sessionStart = new Date(session.createdAt);

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: session.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Metadata
  const date = new Date(session.createdAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${date}  •  ${formatDuration(transcription.metadata.duration)}  •  ${transcription.speakers.length} speaker${transcription.speakers.length !== 1 ? 's' : ''}  •  ${transcription.metadata.wordCount.toLocaleString()} words`,
          color: '666666',
          size: 20,
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Horizontal line
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      },
      spacing: { after: 400 },
    })
  );

  // Summary if available (only if transcript is included)
  if (includeTranscript && transcription.summary) {
    children.push(
      new Paragraph({
        text: 'Summary',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        text: transcription.summary,
        spacing: { after: 400 },
      })
    );
  }

  // Transcript (only if included)
  if (includeTranscript) {
    children.push(
      new Paragraph({
        text: 'Transcript',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    if (cleanedTranscript) {
      // Use cleaned transcript - split by newlines
      const paragraphs = cleanedTranscript.split('\n').filter(p => p.trim());
      paragraphs.forEach((para) => {
        children.push(
          new Paragraph({
            text: para,
            spacing: { after: 200 },
          })
        );
      });
    } else if (transcription.utterances.length > 0) {
      // Regular transcript with timestamps
      transcription.utterances.forEach((u) => {
        const speaker = transcription.speakers.find(s => s.id === u.speaker);
        const speakerName = speaker?.label || `Speaker ${u.speaker + 1}`;
        const actualTime = new Date(sessionStart.getTime() + u.start * 1000);
        const timeStr = actualTime.toLocaleTimeString();

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[${timeStr}] `,
                color: '888888',
                size: 20,
              }),
              new TextRun({
                text: `${speakerName}: `,
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: u.text,
                size: 22,
              }),
            ],
            spacing: { after: 160 },
          })
        );
      });
    } else {
      children.push(
        new Paragraph({
          text: transcription.transcript,
          spacing: { after: 200 },
        })
      );
    }
  }

  // Enrichments
  if (enrichmentsToInclude.length > 0) {
    children.push(
      new Paragraph({
        text: 'AI Insights',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    enrichmentsToInclude.forEach((enrichment) => {
      const label = getEnrichmentLabel(enrichment.type);
      children.push(
        new Paragraph({
          text: label,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      const paragraphs = enrichment.content.split('\n').filter(p => p.trim());
      paragraphs.forEach((para) => {
        children.push(
          new Paragraph({
            text: para,
            spacing: { after: 100 },
          })
        );
      });
    });
  }

  // Footer
  children.push(
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      },
      spacing: { before: 400 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated by EverlastAI',
          color: '999999',
          size: 18,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    })
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const filename = `${session.title.replace(/[^a-z0-9]/gi, '_')}.docx`;
  saveAs(blob, filename);
}

// ============================================================================
// Helpers
// ============================================================================

function formatActualTime(sessionStart: string, offsetSeconds: number): string {
  const startTime = new Date(sessionStart);
  const actualTime = new Date(startTime.getTime() + offsetSeconds * 1000);
  return actualTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getEnrichmentLabel(type: string): string {
  const labels: Record<string, string> = {
    summary: 'Summary',
    'action-items': 'Action Items',
    insights: 'Key Insights',
    translate: 'Translation',
    format: 'Formatted Text',
    notes: 'Notes',
    cleanup: 'Cleaned Transcript',
  };
  return labels[type] || type;
}
