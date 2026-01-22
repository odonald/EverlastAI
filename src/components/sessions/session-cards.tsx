'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Users,
  FileText,
  Star,
  Trash2,
  Loader2,
  Mic,
  X,
  Check,
  Calendar,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { cn, formatDurationHuman } from '@/lib/utils';
import { SessionListItem } from '@/lib/sessions';
import { enrich, type LLMProvider } from '@/lib/llm';
import { useSettings } from '@/hooks/use-settings';

interface SessionCardsProps {
  sessions: SessionListItem[];
  isLoading: boolean;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onToggleStar: (sessionId: string, starred: boolean) => void;
}

export function SessionCards({
  sessions,
  isLoading,
  onSelectSession,
  onDeleteSession,
  onToggleStar,
}: SessionCardsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Loading sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-state-icon">
          <Mic className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold">No recordings yet</h3>
        <p className="mt-2 text-muted-foreground max-w-sm">
          Start your first recording to capture and transcribe voice with AI-powered enrichment.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Press <kbd className="mono rounded bg-muted px-1.5 py-0.5 text-xs">⌘⇧R</kbd> to record from anywhere</span>
        </div>
      </div>
    );
  }

  // Group sessions by date
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="space-y-10">
      {Object.entries(groupedSessions).map(([dateLabel, dateSessions], groupIndex) => (
        <div key={dateLabel} className="animate-fade-in-up" style={{ animationDelay: `${groupIndex * 100}ms` }}>
          <div className="mb-4 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {dateLabel}
            </h3>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground/60">
              {dateSessions.length} {dateSessions.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>

          {/* Daily Summary */}
          {dateSessions.length > 1 && (
            <DailySummary
              sessions={dateSessions}
              dateLabel={dateLabel}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dateSessions.map((session, index) => (
              <SessionCard
                key={session.id}
                session={session}
                onSelect={() => onSelectSession(session.id)}
                onDelete={() => onDeleteSession(session.id)}
                onToggleStar={() => onToggleStar(session.id, !session.starred)}
                style={{ animationDelay: `${(groupIndex * 100) + (index * 50)}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SessionCardProps {
  session: SessionListItem;
  onSelect: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  style?: React.CSSProperties;
}

function SessionCard({ session, onSelect, onDelete, onToggleStar, style }: SessionCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card p-5 transition-all duration-300 cursor-pointer animate-fade-in-up',
        'hover:shadow-soft-lg hover:border-primary/20 hover:-translate-y-0.5',
        confirmingDelete && 'border-destructive/50 shadow-none translate-y-0'
      )}
      style={style}
      onClick={confirmingDelete ? undefined : onSelect}
    >
      {/* Delete confirmation overlay */}
      {confirmingDelete && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-card/98 backdrop-blur-sm animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 mb-3">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <p className="font-medium">Delete this recording?</p>
          <p className="text-sm text-muted-foreground mt-1">This action cannot be undone</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmingDelete(false);
              }}
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setConfirmingDelete(false);
              }}
              className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              <Check className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Star button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar();
        }}
        className={cn(
          'absolute right-4 top-4 p-2 rounded-xl transition-all duration-200',
          session.starred
            ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
            : 'text-muted-foreground/30 hover:text-amber-500 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100'
        )}
      >
        <Star className={cn('h-4 w-4', session.starred && 'fill-current')} />
      </button>

      {/* Title */}
      <h4 className="pr-10 font-semibold leading-tight line-clamp-2 text-foreground">
        {session.title}
      </h4>

      {/* Preview text */}
      <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {session.preview}
      </p>

      {/* Metadata */}
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span className="mono">{formatDurationHuman(session.duration)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {session.speaker_count}
        </span>
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {session.word_count.toLocaleString()}
        </span>
      </div>

      {/* Tags */}
      {session.tags && session.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {session.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
          {session.tags.length > 3 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              +{session.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
        </span>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(true);
          }}
          className="p-2 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Daily Summary Component
interface DailySummaryProps {
  sessions: SessionListItem[];
  dateLabel: string;
}

function DailySummary({ sessions, dateLabel }: DailySummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  // Cache key for localStorage
  const cacheKey = `daily-summary-${dateLabel}-${sessions.map(s => s.id).sort().join('-')}`;

  // Check localStorage for cached summary on mount
  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid (24 hours)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setSummary(parsed.summary);
        }
      } catch {
        // Invalid cache, ignore
      }
    }
  }, [cacheKey]);

  const totalDuration = sessions.reduce((acc, s) => acc + s.duration, 0);

  const getApiKey = () => {
    if (settings.llmProvider === 'openai') return settings.apiKeys.openai;
    if (settings.llmProvider === 'anthropic') return settings.apiKeys.anthropic;
    return undefined;
  };

  const hasLLMConfigured = () => {
    if (settings.llmProvider === 'ollama') return true;
    return !!getApiKey();
  };

  const handleExpand = async () => {
    if (!expanded) {
      // Expanding
      if (!summary && hasLLMConfigured()) {
        setLoading(true);
        setError(null);
        try {
          // Build context from sessions
          const context = sessions.map((s, i) => {
            return `Recording ${i + 1}: "${s.title}"
Duration: ${formatDurationHuman(s.duration)}
Preview: ${s.preview}
---`;
          }).join('\n\n');

          const result = await enrich(context, {
            provider: settings.llmProvider as LLMProvider,
            mode: 'daily-summary',
            apiKey: getApiKey(),
            ollamaEndpoint: settings.ollamaEndpoint,
            ollamaModel: settings.ollamaModel,
          });

          setSummary(result);
          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify({
            summary: result,
            timestamp: Date.now(),
          }));
        } catch (err) {
          console.error('Failed to generate daily summary:', err);
          setError(err instanceof Error ? err.message : 'Failed to generate summary');
        } finally {
          setLoading(false);
        }
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/20 overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-violet-500/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-violet-700 dark:text-violet-300">Daily Summary</div>
          <div className="text-sm text-muted-foreground">
            {sessions.length} recordings • {formatDurationHuman(totalDuration)} total
          </div>
        </div>
        <ChevronDown className={cn(
          'h-5 w-5 text-muted-foreground transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-violet-500/10 animate-fade-in">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <span className="ml-3 text-sm text-muted-foreground">Generating summary...</span>
            </div>
          ) : error ? (
            <div className="py-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={handleExpand}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Try again
              </button>
            </div>
          ) : !hasLLMConfigured() ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Configure an LLM provider in Settings to generate daily summaries.
              </p>
            </div>
          ) : summary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {summary}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500 mx-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function groupSessionsByDate(sessions: SessionListItem[]): Record<string, SessionListItem[]> {
  const groups: Record<string, SessionListItem[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  for (const session of sessions) {
    const sessionDate = new Date(session.created_at);
    sessionDate.setHours(0, 0, 0, 0);

    let label: string;
    if (sessionDate.getTime() === today.getTime()) {
      label = 'Today';
    } else if (sessionDate.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else if (sessionDate > lastWeek) {
      label = 'This Week';
    } else {
      label = sessionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(session);
  }

  return groups;
}
