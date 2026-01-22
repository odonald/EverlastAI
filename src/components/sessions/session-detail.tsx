'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Clock,
  Users,
  FileText,
  Globe,
  Sparkles,
  Copy,
  Check,
  Download,
  Edit2,
  ArrowLeft,
  Loader2,
  ListTodo,
  Lightbulb,
  Languages,
  Trash2,
  ChevronDown,
  ChevronRight,
  Mail,
  Webhook,
  X,
  Eraser,
  Calendar,
  Info,
  Wand2,
} from 'lucide-react';
import { cn, formatDuration, formatTimestamp } from '@/lib/utils';
import { FullSession, addEnrichmentToSession, deleteEnrichmentFromSession, updateSpeakerName } from '@/lib/sessions';
import { Button } from '@/components/ui/button';
import { enrich, SUPPORTED_LANGUAGES, type EnrichmentMode } from '@/lib/llm';
import { exportToPDF, exportToEmail, exportToWebhook, exportToNotion, exportToTxt, exportToDocx } from '@/lib/export';
import { useSettings } from '@/hooks/use-settings';
import { useAuth } from '@/hooks/use-auth';
import { SessionEnrichment } from '@/types/transcription';
import { toast } from '@/hooks/use-toast';

// Notion logo as inline SVG
function NotionLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" />
      <path
        fill="white"
        d="M61.35 36.077c0 2.127-.18 2.127-1.26 2.867l-7.92 5.4v36.487c0 2.013-.45 3.147-1.89 3.147-.9 0-1.8-.45-2.7-1.35l-8.55-11.07c-2.7-3.51-3.87-5.4-3.87-8.55V39.77l-7.38-5.22c-.9-.63-1.08-1.08-1.08-2.16 0-1.53 1.17-2.7 3.06-2.88l28.53-1.71c1.8-.09 2.79.36 2.79 2.16v6.127h.27zM44.737 9.597l40.32-2.97c4.95-.36 6.21.78 6.21 4.86v56.34c0 3.33-1.71 5.22-5.4 5.49l-42.93 2.61c-2.79.18-4.14-.36-5.49-2.07l-12.42-16.11c-1.53-1.98-2.16-3.42-2.16-5.13V15.637c0-3.15 1.26-5.67 5.13-5.94l16.74-.1z"
      />
    </svg>
  );
}

interface SessionDetailProps {
  session: FullSession;
  onUpdateTitle: (title: string) => void;
  onClose: () => void;
  onSessionUpdate?: (session: FullSession) => void;
  onOpenSettings?: (tab?: string) => void;
}

// AI Action definitions
const AI_ACTIONS = [
  {
    id: 'summary' as const,
    label: 'Summary',
    icon: Sparkles,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    description: 'Create a concise summary capturing the main points and key takeaways from the transcript.',
  },
  {
    id: 'action-items' as const,
    label: 'Tasks',
    icon: ListTodo,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    description: 'Extract actionable tasks, to-dos, and assignments mentioned in the conversation.',
  },
  {
    id: 'insights' as const,
    label: 'Insights',
    icon: Lightbulb,
    color: 'bg-violet-500',
    lightColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    description: 'Identify key insights, best practices, and important learnings from the discussion.',
  },
  {
    id: 'translate' as const,
    label: 'Translate',
    icon: Languages,
    color: 'bg-sky-500',
    lightColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    description: 'Translate the transcript into another language while preserving speaker labels.',
  },
  {
    id: 'cleanup' as const,
    label: 'Format',
    icon: Eraser,
    color: 'bg-teal-500',
    lightColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    description: 'Clean up the transcript by fixing grammar, removing filler words, and improving readability.',
  },
  {
    id: 'custom' as const,
    label: 'Custom',
    icon: Wand2,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    description: 'Enter your own custom instruction to process the transcript any way you want.',
  },
];

// Get human-readable tab label from enrichment type
function getTabLabel(type: string, targetLanguage?: string, customLabel?: string): string {
  const labels: Record<string, string> = {
    summary: 'Summary',
    'action-items': 'Tasks',
    insights: 'Insights',
    translate: targetLanguage ? `${targetLanguage}` : 'Translation',
    cleanup: 'Formatted',
    custom: customLabel || 'Custom',
    notes: 'Notes',
  };
  return labels[type] || type;
}

// Speaker colors - vibrant and distinct
const SPEAKER_COLORS = [
  { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', light: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', light: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', light: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', light: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', light: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { bg: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', light: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
];

export function SessionDetail({ session, onUpdateTitle, onClose, onSessionUpdate, onOpenSettings }: SessionDetailProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(session.title);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('transcript'); // 'transcript' or enrichment ID

  // AI Actions state
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);
  const [showTranslateDropdown, setShowTranslateDropdown] = useState(false);
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showInfoFor, setShowInfoFor] = useState<string | null>(null);
  const [enrichments, setEnrichments] = useState<SessionEnrichment[]>(session.enrichments || []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAIEditDropdown, setShowAIEditDropdown] = useState(false);
  // Pending enrichment shown while AI is processing
  const [pendingEnrichment, setPendingEnrichment] = useState<{
    id: string;
    type: SessionEnrichment['type'];
    targetLanguage?: string;
    customPrompt?: string;
  } | null>(null);

  // Export state
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [showNotionPageInput, setShowNotionPageInput] = useState(false);
  const [notionPageId, setNotionPageId] = useState('');
  const [exportTabs, setExportTabs] = useState<Set<string>>(new Set(['transcript']));

  // Speaker naming state
  const [editingSpeakerId, setEditingSpeakerId] = useState<number | null>(null);
  const [speakerNameInput, setSpeakerNameInput] = useState('');
  const [speakerNames, setSpeakerNames] = useState<Record<number, string>>(() => {
    // Initialize from existing speaker labels
    const names: Record<number, string> = {};
    session.transcription.speakers.forEach(s => {
      if (s.label) names[s.id] = s.label;
    });
    return names;
  });

  const translateDropdownRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const aiEditDropdownRef = useRef<HTMLDivElement>(null);

  const { settings } = useSettings();
  const { user } = useAuth();
  const { transcription } = session;

  // Build dynamic tabs from enrichments (including pending)
  const tabs = useMemo(() => {
    const baseTabs = [{ id: 'transcript', label: 'Transcript', type: 'transcript' as const, isPending: false }];
    const enrichmentTabs = enrichments.map(e => ({
      id: e.id,
      label: getTabLabel(e.type, e.targetLanguage),
      type: e.type,
      enrichment: e,
      isPending: false,
    }));

    // Add pending tab if one exists
    if (pendingEnrichment) {
      enrichmentTabs.push({
        id: pendingEnrichment.id,
        label: getTabLabel(pendingEnrichment.type, pendingEnrichment.targetLanguage),
        type: pendingEnrichment.type,
        enrichment: undefined as unknown as SessionEnrichment,
        isPending: true,
      });
    }

    return [...baseTabs, ...enrichmentTabs];
  }, [enrichments, pendingEnrichment]);

  // Get current active enrichment if viewing an enrichment tab
  const activeEnrichment = useMemo(() => {
    if (activeTab === 'transcript') return null;
    return enrichments.find(e => e.id === activeTab) || null;
  }, [activeTab, enrichments]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (translateDropdownRef.current && !translateDropdownRef.current.contains(event.target as Node)) {
        setShowTranslateDropdown(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
        setShowNotionPageInput(false);
      }
      if (aiEditDropdownRef.current && !aiEditDropdownRef.current.contains(event.target as Node)) {
        setShowAIEditDropdown(false);
        setShowTranslateDropdown(false);
        setShowCustomPromptInput(false);
        setShowInfoFor(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== session.title) {
      onUpdateTitle(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCopyTranscript = async () => {
    await navigator.clipboard.writeText(transcription.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    const content = generateExportContent(session);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportingType('pdf');
    try {
      await exportToPDF(session, { includeTabs: Array.from(exportTabs) });
      toast({ title: 'PDF exported', description: 'Your transcript has been saved as PDF.' });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({ title: 'Export failed', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setShowExportDropdown(false);
    }
  };

  const handleExportEmail = () => {
    exportToEmail(session);
    setShowExportDropdown(false);
  };

  const handleExportWebhook = async () => {
    if (!settings.webhookUrl) {
      setShowExportDropdown(false);
      if (onOpenSettings) {
        onOpenSettings('integrations');
      } else {
        toast({
          title: 'Webhook not configured',
          description: 'Configure a webhook URL in Settings → Integrations first.',
          variant: 'destructive',
        });
      }
      return;
    }

    setIsExporting(true);
    setExportingType('webhook');
    try {
      const result = await exportToWebhook(session, settings.webhookUrl);
      if (result.success) {
        toast({ title: 'Sent to webhook', description: 'Your transcript has been sent successfully.' });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Webhook export failed:', error);
      toast({
        title: 'Webhook failed',
        description: error instanceof Error ? error.message : 'Failed to send to webhook.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setShowExportDropdown(false);
    }
  };

  const handleExportTxt = () => {
    // Check if there's a cleanup enrichment to use
    const cleanupEnrichment = enrichments.find(e => e.type === 'cleanup');
    exportToTxt(session, cleanupEnrichment?.content);
    setShowExportDropdown(false);
    toast({ title: 'TXT exported', description: 'Your transcript has been saved as a text file.' });
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    setExportingType('docx');
    try {
      // Check if there's a cleanup enrichment to use
      const cleanupEnrichment = enrichments.find(e => e.type === 'cleanup');
      await exportToDocx(session, {
        cleanedTranscript: cleanupEnrichment?.content,
        includeTabs: Array.from(exportTabs),
      });
      toast({ title: 'Word document exported', description: 'Your transcript has been saved as a .docx file.' });
    } catch (error) {
      console.error('DOCX export failed:', error);
      toast({ title: 'Export failed', description: 'Failed to generate Word document.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setShowExportDropdown(false);
    }
  };

  const handleExportNotion = async () => {
    if (!settings.notion?.accessToken) {
      setShowExportDropdown(false);
      if (onOpenSettings) {
        onOpenSettings('integrations');
      } else {
        toast({
          title: 'Notion not connected',
          description: 'Connect Notion in Settings → Integrations first.',
          variant: 'destructive',
        });
      }
      return;
    }

    if (!notionPageId.trim()) {
      setShowNotionPageInput(true);
      return;
    }

    setIsExporting(true);
    setExportingType('notion');
    try {
      const result = await exportToNotion(session, {
        accessToken: settings.notion.accessToken,
        parentPageId: notionPageId.trim(),
      });

      if (result.success) {
        toast({
          title: 'Exported to Notion',
          description: (
            <span>
              Your transcript has been created.{' '}
              {result.pageUrl && (
                <a
                  href={result.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Open in Notion
                </a>
              )}
            </span>
          ),
        });
        setNotionPageId('');
        setShowNotionPageInput(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Notion export failed:', error);
      toast({
        title: 'Notion export failed',
        description: error instanceof Error ? error.message : 'Failed to export to Notion.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setShowExportDropdown(false);
    }
  };

  const getApiKey = () => {
    if (settings.llmProvider === 'openai') return settings.apiKeys.openai;
    if (settings.llmProvider === 'anthropic') return settings.apiKeys.anthropic;
    return undefined;
  };

  const hasLLMConfigured = () => {
    if (settings.llmProvider === 'ollama') return true;
    return !!getApiKey();
  };

  const handleAIAction = async (actionId: EnrichmentMode, targetLanguage?: string, customPromptText?: string) => {
    if (!hasLLMConfigured()) {
      setActionError('Configure an LLM provider in Settings first');
      return;
    }

    // Create a pending enrichment ID and show it immediately
    const pendingId = `pending-${crypto.randomUUID()}`;
    const enrichmentType = actionId === 'action-items' ? 'action-items' : actionId;

    setPendingEnrichment({
      id: pendingId,
      type: enrichmentType as SessionEnrichment['type'],
      targetLanguage,
      customPrompt: customPromptText,
    });

    // Switch to the pending tab immediately
    setActiveTab(pendingId);

    setIsProcessingAction(true);
    setProcessingActionId(actionId);
    setActionError(null);
    setShowTranslateDropdown(false);
    setShowAIEditDropdown(false);
    setShowCustomPromptInput(false);
    setCustomPrompt('');

    try {
      const result = await enrich(transcription.transcript, {
        provider: settings.llmProvider,
        mode: actionId,
        apiKey: getApiKey(),
        ollamaEndpoint: settings.ollamaEndpoint,
        ollamaModel: settings.ollamaModel,
        targetLanguage,
        customPrompt: customPromptText,
      });

      const newEnrichment = await addEnrichmentToSession(
        session.id,
        {
          type: enrichmentType as SessionEnrichment['type'],
          content: result,
          provider: settings.llmProvider,
          targetLanguage,
        },
        user?.email
      );

      // Clear pending and add real enrichment
      setPendingEnrichment(null);
      setEnrichments(prev => [...prev, newEnrichment]);
      // Switch to the new enrichment tab
      setActiveTab(newEnrichment.id);
      // Add to export selection by default
      setExportTabs(prev => new Set([...Array.from(prev), newEnrichment.id]));

      if (onSessionUpdate) {
        onSessionUpdate({
          ...session,
          enrichments: [...(session.enrichments || []), newEnrichment],
        });
      }
    } catch (error) {
      console.error('AI action failed:', error);
      setActionError(error instanceof Error ? error.message : 'AI action failed');
      // Clear pending on error and go back to transcript
      setPendingEnrichment(null);
      setActiveTab('transcript');
    } finally {
      setIsProcessingAction(false);
      setProcessingActionId(null);
    }
  };

  const handleDeleteEnrichment = async (enrichmentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      await deleteEnrichmentFromSession(session.id, enrichmentId, user?.email);
      setEnrichments(prev => prev.filter(e => e.id !== enrichmentId));
      // If we're deleting the active tab, switch to transcript
      if (activeTab === enrichmentId) {
        setActiveTab('transcript');
      }
      // Remove from export selection
      setExportTabs(prev => {
        const next = new Set(prev);
        next.delete(enrichmentId);
        return next;
      });
      if (onSessionUpdate) {
        onSessionUpdate({
          ...session,
          enrichments: (session.enrichments || []).filter(e => e.id !== enrichmentId),
        });
      }
    } catch (error) {
      console.error('Failed to delete enrichment:', error);
    }
  };

  const getEnrichmentMeta = (type: SessionEnrichment['type']) => {
    const action = AI_ACTIONS.find(a => a.id === type || (a.id === 'action-items' && type === 'action-items'));
    return action || AI_ACTIONS[0];
  };

  const toggleExportTab = (tabId: string) => {
    setExportTabs(prev => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        // Don't allow deselecting all tabs - keep at least transcript
        if (tabId === 'transcript' && next.size === 1) return prev;
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  };

  // Speaker naming handlers
  const handleStartEditSpeaker = (speakerId: number) => {
    setEditingSpeakerId(speakerId);
    setSpeakerNameInput(speakerNames[speakerId] || '');
  };

  const handleSaveSpeakerName = async () => {
    if (editingSpeakerId === null) return;

    const trimmedName = speakerNameInput.trim();

    // Update local state immediately
    setSpeakerNames(prev => {
      if (trimmedName) {
        return { ...prev, [editingSpeakerId]: trimmedName };
      } else {
        const next = { ...prev };
        delete next[editingSpeakerId];
        return next;
      }
    });

    setEditingSpeakerId(null);
    setSpeakerNameInput('');

    // Persist to storage
    try {
      const updatedSession = await updateSpeakerName(session.id, editingSpeakerId, trimmedName, user?.email);
      if (onSessionUpdate) {
        onSessionUpdate(updatedSession);
      }
    } catch (error) {
      console.error('Failed to save speaker name:', error);
    }
  };

  const getSpeakerDisplayName = (speakerId: number) => {
    return speakerNames[speakerId] || `Speaker ${speakerId + 1}`;
  };

  const uniqueSpeakers = Array.from(new Set(transcription.utterances.map(u => u.speaker)));

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Minimal Header */}
      <header className="shrink-0 border-b bg-card/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          {/* Back */}
          <button
            onClick={onClose}
            className="shrink-0 p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full bg-transparent text-lg sm:text-xl font-semibold focus:outline-none border-b-2 border-primary pb-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  onBlur={handleSaveTitle}
                />
              </div>
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-2 text-left max-w-full"
              >
                <h1 className="text-lg sm:text-xl font-semibold truncate">{session.title}</h1>
                <Edit2 className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyTranscript}
              className="rounded-xl gap-1.5 px-2 sm:px-3"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline text-sm">{copied ? 'Copied' : 'Copy'}</span>
            </Button>

            {/* AI Edit Dropdown */}
            <div className="relative" ref={aiEditDropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIEditDropdown(!showAIEditDropdown)}
                disabled={isProcessingAction}
                className="rounded-xl gap-1.5 px-2 sm:px-3"
              >
                {isProcessingAction ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="hidden sm:inline text-sm">AI Edit</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>

              {showAIEditDropdown && (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border bg-popover p-2 shadow-xl animate-scale-in">
                  {/* Error display */}
                  {actionError && (
                    <div className="mb-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center justify-between">
                      <span className="truncate">{actionError}</span>
                      <button onClick={() => setActionError(null)} className="p-0.5 hover:bg-destructive/10 rounded shrink-0 ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {AI_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const isProcessing = isProcessingAction && processingActionId === action.id;

                    if (action.id === 'translate') {
                      return (
                        <div key={action.id} className="relative" ref={translateDropdownRef}>
                          <div className="flex items-center">
                            <button
                              disabled={isProcessingAction}
                              onClick={() => setShowTranslateDropdown(!showTranslateDropdown)}
                              className={cn(
                                'flex-1 flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50',
                                showTranslateDropdown && 'bg-muted'
                              )}
                            >
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', action.lightColor)}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                              </div>
                              <div className="text-left flex-1">
                                <div className="font-medium">{action.label}</div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowInfoFor(showInfoFor === action.id ? null : action.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors mr-1"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {showInfoFor === action.id && (
                            <div className="mx-3 mb-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-150">
                              {action.description}
                            </div>
                          )}

                          {showTranslateDropdown && (
                            <div className="absolute left-full top-0 z-40 ml-2 w-48 max-h-64 overflow-y-auto rounded-xl border bg-popover p-2 shadow-xl animate-scale-in">
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <button
                                  key={lang.code}
                                  onClick={() => handleAIAction('translate', lang.name)}
                                  className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-muted transition-colors"
                                >
                                  {lang.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (action.id === 'custom') {
                      return (
                        <div key={action.id}>
                          <div className="flex items-center">
                            <button
                              disabled={isProcessingAction}
                              onClick={() => setShowCustomPromptInput(!showCustomPromptInput)}
                              className={cn(
                                'flex-1 flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50',
                                showCustomPromptInput && 'bg-muted'
                              )}
                            >
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', action.lightColor)}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                              </div>
                              <div className="text-left flex-1">
                                <div className="font-medium">{action.label}</div>
                              </div>
                              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showCustomPromptInput && 'rotate-180')} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowInfoFor(showInfoFor === action.id ? null : action.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors mr-1"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {showInfoFor === action.id && (
                            <div className="mx-3 mb-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-150">
                              {action.description}
                            </div>
                          )}
                          {showCustomPromptInput && (
                            <div className="mx-3 mb-2 p-2 rounded-lg bg-muted/50 animate-in fade-in slide-in-from-top-1 duration-150">
                              <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Describe what you want to do with the transcript..."
                                className="w-full px-2 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[60px]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) {
                                    e.preventDefault();
                                    handleAIAction('custom', undefined, customPrompt.trim());
                                  }
                                  if (e.key === 'Escape') {
                                    setShowCustomPromptInput(false);
                                    setCustomPrompt('');
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAIAction('custom', undefined, customPrompt.trim())}
                                disabled={!customPrompt.trim() || isProcessingAction}
                                className="w-full mt-2 rounded-lg"
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Wand2 className="h-4 w-4 mr-2" />
                                )}
                                Run Custom Action
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={action.id}>
                        <div className="flex items-center">
                          <button
                            disabled={isProcessingAction}
                            onClick={() => handleAIAction(action.id)}
                            className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', action.lightColor)}>
                              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium">{action.label}</div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowInfoFor(showInfoFor === action.id ? null : action.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors mr-1"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {showInfoFor === action.id && (
                          <div className="mx-3 mb-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-150">
                            {action.description}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!hasLLMConfigured() && (
                    <p className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center">
                      Configure an LLM in Settings
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="rounded-xl gap-1.5 px-2 sm:px-3"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline text-sm">Export</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>

              {showExportDropdown && (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 max-h-[70vh] overflow-y-auto rounded-xl border bg-popover p-2 shadow-xl animate-scale-in">
                  {/* Notion Page ID Input */}
                  {showNotionPageInput && (
                    <div className="mb-2 p-2 rounded-lg bg-muted/50">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Notion Page ID
                      </label>
                      <input
                        type="text"
                        value={notionPageId}
                        onChange={(e) => setNotionPageId(e.target.value)}
                        placeholder="Paste page ID or URL"
                        className="w-full px-2 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleExportNotion();
                          if (e.key === 'Escape') {
                            setShowNotionPageInput(false);
                            setNotionPageId('');
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Find the ID in the page URL after the workspace name
                      </p>
                      <Button
                        size="sm"
                        onClick={handleExportNotion}
                        disabled={!notionPageId.trim() || isExporting}
                        className="w-full mt-2 rounded-lg"
                      >
                        {exportingType === 'notion' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Export to Notion
                      </Button>
                    </div>
                  )}

                  {!showNotionPageInput && (
                    <>
                      {/* Tab Selection - only show if there are enrichments */}
                      {tabs.length > 1 && (
                        <div className="mb-2 pb-2 border-b">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <p className="text-xs font-medium text-muted-foreground">Include in export:</p>
                            <button
                              onClick={() => {
                                const allSelected = tabs.every(tab => exportTabs.has(tab.id));
                                if (allSelected) {
                                  // Deselect all except transcript
                                  setExportTabs(new Set(['transcript']));
                                } else {
                                  // Select all
                                  setExportTabs(new Set(tabs.map(tab => tab.id)));
                                }
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              {tabs.every(tab => exportTabs.has(tab.id)) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="space-y-1">
                            {tabs.map((tab) => (
                              <label
                                key={tab.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={exportTabs.has(tab.id)}
                                  onChange={() => toggleExportTab(tab.id)}
                                  className="rounded border-muted-foreground/30"
                                />
                                <span className="flex-1">{tab.label}</span>
                                {tab.type !== 'transcript' && (
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {tab.type === 'action-items' ? 'tasks' : tab.type}
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PDF */}
                      <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                          {exportingType === 'pdf' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-medium">PDF Document</div>
                          <div className="text-xs text-muted-foreground">Formatted for printing</div>
                        </div>
                      </button>

                      {/* Word Document */}
                      <button
                        onClick={handleExportDocx}
                        disabled={isExporting}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
                          {exportingType === 'docx' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          ) : (
                            <FileText className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Word Document</div>
                          <div className="text-xs text-muted-foreground">.docx format</div>
                        </div>
                      </button>

                      {/* TXT */}
                      <button
                        onClick={handleExportTxt}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Plain Text</div>
                          <div className="text-xs text-muted-foreground">.txt format</div>
                        </div>
                      </button>

                      {/* Markdown */}
                      <button
                        onClick={handleExportMarkdown}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Markdown</div>
                          <div className="text-xs text-muted-foreground">Plain text with formatting</div>
                        </div>
                      </button>

                      {/* Email */}
                      <button
                        onClick={handleExportEmail}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Email</div>
                          <div className="text-xs text-muted-foreground">Open in your email app</div>
                        </div>
                      </button>

                      <div className="my-2 border-t" />

                      {/* Webhook */}
                      <button
                        onClick={handleExportWebhook}
                        disabled={isExporting}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50',
                          !settings.webhookUrl && 'opacity-50'
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          {exportingType === 'webhook' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                          ) : (
                            <Webhook className="h-4 w-4 text-violet-500" />
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium">Webhook</div>
                          <div className="text-xs text-muted-foreground">
                            {settings.webhookUrl ? 'Send to configured endpoint' : 'Configure in Settings'}
                          </div>
                        </div>
                        {settings.webhookUrl && <Check className="h-4 w-4 text-emerald-500" />}
                      </button>

                      {/* Notion */}
                      <button
                        onClick={() => settings.notion ? setShowNotionPageInput(true) : handleExportNotion()}
                        disabled={isExporting}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors disabled:opacity-50',
                          !settings.notion && 'opacity-50'
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center">
                          <NotionLogo className="h-4 w-4 text-white dark:text-neutral-900" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium">Notion</div>
                          <div className="text-xs text-muted-foreground">
                            {settings.notion ? `${settings.notion.workspaceName}` : 'Connect in Settings'}
                          </div>
                        </div>
                        {settings.notion && <Check className="h-4 w-4 text-emerald-500" />}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 sm:px-6 pb-3 sm:pb-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">{new Date(session.createdAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">{formatDuration(transcription.metadata.duration)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs">{transcription.speakers.length} speaker{transcription.speakers.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-xs">{transcription.metadata.wordCount.toLocaleString()} words</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs">{transcription.detectedLanguage.toUpperCase()}</span>
            </div>
          </div>

          {/* Speaker Legend - separate row when multiple speakers */}
          {uniqueSpeakers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground mr-1">Speakers:</span>
              {uniqueSpeakers.slice(0, 6).map((speaker) => {
                const color = SPEAKER_COLORS[speaker % SPEAKER_COLORS.length];
                const isEditing = editingSpeakerId === speaker;
                const displayName = getSpeakerDisplayName(speaker);

                if (isEditing) {
                  return (
                    <div key={speaker} className={cn('flex items-center gap-1.5 px-1 py-0.5 rounded-full', color.light, 'ring-2 ring-primary')}>
                      <div className={cn('h-2 w-2 rounded-full shrink-0', color.bg)} />
                      <input
                        type="text"
                        value={speakerNameInput}
                        onChange={(e) => setSpeakerNameInput(e.target.value)}
                        placeholder={`Speaker ${speaker + 1}`}
                        className="w-20 bg-transparent text-xs font-medium focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSpeakerName();
                          if (e.key === 'Escape') {
                            setEditingSpeakerId(null);
                            setSpeakerNameInput('');
                          }
                        }}
                        onBlur={handleSaveSpeakerName}
                      />
                    </div>
                  );
                }

                return (
                  <button
                    key={speaker}
                    onClick={() => handleStartEditSpeaker(speaker)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all',
                      color.light,
                      'hover:ring-2 hover:ring-primary/50'
                    )}
                    title="Click to rename speaker"
                  >
                    <div className={cn('h-2 w-2 rounded-full', color.bg)} />
                    <span className={cn('text-xs font-medium', color.text)}>{displayName}</span>
                    <Edit2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 hover:opacity-100" />
                  </button>
                );
              })}
              {uniqueSpeakers.length > 6 && (
                <span className="text-xs text-muted-foreground">+{uniqueSpeakers.length - 6} more</span>
              )}
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 px-4 sm:px-6 pb-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const meta = tab.type !== 'transcript' ? getEnrichmentMeta(tab.type as SessionEnrichment['type']) : null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shrink-0 group',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {meta && <meta.icon className="h-3.5 w-3.5" />}
                {tab.label}
                {tab.type !== 'transcript' && (
                  <button
                    onClick={(e) => handleDeleteEnrichment(tab.id, e)}
                    className={cn(
                      'ml-1 p-0.5 rounded transition-colors',
                      isActive
                        ? 'hover:bg-primary-foreground/20'
                        : 'hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100'
                    )}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'transcript' ? (
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-16">
            {/* Summary Card */}
            {transcription.summary && (
              <div className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Summary</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{transcription.summary}</p>
              </div>
            )}

            {/* Transcript */}
            <div className="space-y-1">
              {transcription.utterances.length > 0 ? (
                transcription.utterances.map((utterance, index) => {
                  const color = SPEAKER_COLORS[utterance.speaker % SPEAKER_COLORS.length];
                  const prevSpeaker = index > 0 ? transcription.utterances[index - 1].speaker : null;
                  const showSpeaker = prevSpeaker !== utterance.speaker;

                  return (
                    <div
                      key={utterance.id || index}
                      className={cn(
                        'group relative',
                        showSpeaker && index > 0 && 'mt-6'
                      )}
                    >
                      {showSpeaker && (
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold', color.bg)}>
                            {speakerNames[utterance.speaker] ? speakerNames[utterance.speaker].charAt(0).toUpperCase() : utterance.speaker + 1}
                          </div>
                          <button
                            onClick={() => handleStartEditSpeaker(utterance.speaker)}
                            className={cn('font-medium hover:underline', color.text)}
                            title="Click to rename speaker"
                          >
                            {getSpeakerDisplayName(utterance.speaker)}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {formatActualTime(session.createdAt, utterance.start)}
                            <span className="text-muted-foreground/50 ml-1 font-mono">({formatTimestamp(utterance.start)})</span>
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        'ml-11 pl-4 py-2 border-l-2 transition-colors',
                        color.border,
                        'hover:bg-muted/50 rounded-r-lg'
                      )}>
                        <p className="text-[15px] leading-relaxed">{utterance.text}</p>
                        {!showSpeaker && (
                          <span className="text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatActualTime(session.createdAt, utterance.start)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{transcription.transcript}</p>
                </div>
              )}
            </div>

            {/* Topics & Entities */}
            {((transcription.topics?.length ?? 0) > 0 || (transcription.entities?.length ?? 0) > 0) && (
              <div className="mt-12 pt-8 border-t">
                <div className="grid gap-8 sm:grid-cols-2">
                  {transcription.topics && transcription.topics.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {transcription.topics.map((topic, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {topic.topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {transcription.entities && transcription.entities.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Entities</h3>
                      <div className="flex flex-wrap gap-2">
                        {transcription.entities.slice(0, 8).map((entity, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-lg border bg-card text-sm">
                            <span className="text-muted-foreground">{entity.type}:</span> {entity.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : pendingEnrichment && activeTab === pendingEnrichment.id ? (
          /* Pending Enrichment Tab - Processing State */
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-16">
            <div className="rounded-2xl border bg-card p-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b">
                {(() => {
                  const meta = getEnrichmentMeta(pendingEnrichment.type);
                  const Icon = meta.icon;
                  return (
                    <>
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', meta.lightColor)}>
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold">
                          {pendingEnrichment.type === 'translate'
                            ? `Translating to ${pendingEnrichment.targetLanguage}...`
                            : `Generating ${meta.label}...`}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Processing with {settings.llmProvider}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Loading Content */}
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary animate-gentle-pulse" />
                  </div>
                </div>
                <p className="mt-6 text-muted-foreground">Analyzing your transcript...</p>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                </div>
              </div>
            </div>
          </div>
        ) : activeEnrichment ? (
          /* Enrichment Tab Content */
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-16">
            <div className="rounded-2xl border bg-card p-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b">
                {(() => {
                  const meta = getEnrichmentMeta(activeEnrichment.type);
                  const Icon = meta.icon;
                  return (
                    <>
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', meta.lightColor)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold">
                          {activeEnrichment.type === 'translate'
                            ? `Translation (${activeEnrichment.targetLanguage})`
                            : meta.label}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Generated via {activeEnrichment.provider}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteEnrichment(activeEnrichment.id, e)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete this enrichment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words overflow-x-hidden">
                {activeEnrichment.content}
              </div>
            </div>
          </div>
        ) : (
          /* Fallback - should not happen */
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-16">
            <div className="text-center py-16">
              <p className="text-muted-foreground">Tab not found</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function formatActualTime(sessionStart: string, offsetSeconds: number): string {
  const startTime = new Date(sessionStart);
  const actualTime = new Date(startTime.getTime() + offsetSeconds * 1000);
  return actualTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function generateExportContent(session: FullSession): string {
  const lines: string[] = [
    `# ${session.title}`,
    '',
    `**Date:** ${new Date(session.createdAt).toLocaleString()}`,
    `**Duration:** ${formatDuration(session.transcription.metadata.duration)}`,
    `**Speakers:** ${session.transcription.speakers.length}`,
    `**Words:** ${session.transcription.metadata.wordCount}`,
    '',
  ];

  if (session.transcription.summary) {
    lines.push('## Summary', '', session.transcription.summary, '');
  }

  lines.push('## Transcript', '');

  if (session.transcription.utterances.length > 0) {
    session.transcription.utterances.forEach((u) => {
      const speaker = session.transcription.speakers.find(s => s.id === u.speaker);
      const speakerName = speaker?.label || `Speaker ${u.speaker + 1}`;
      const actualTime = formatActualTime(session.createdAt, u.start);
      lines.push(`**${speakerName}** [${actualTime}]: ${u.text}`, '');
    });
  } else {
    lines.push(session.transcription.transcript, '');
  }

  return lines.join('\n');
}
