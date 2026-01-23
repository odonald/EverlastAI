'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { SessionCards } from '@/components/sessions/session-cards';
import { SessionDetail } from '@/components/sessions/session-detail';
import { LiveRecorder } from '@/components/voice/live-recorder';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
import { LoginButton } from '@/components/auth/login-button';
import { UserProfile } from '@/components/auth/user-profile';
import {
  Mic,
  Settings,
  Sparkles,
  Keyboard,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Star,
} from 'lucide-react';
import { enrich, generateTitle } from '@/lib/llm';
import {
  listSessions,
  getSession,
  saveSession,
  deleteSession,
  updateSessionMetadata,
  createSessionFromTranscription,
  SessionListItem,
  FullSession,
} from '@/lib/sessions';
import { TranscriptionResult } from '@/types/transcription';
import { cn } from '@/lib/utils';

// Check if browser is in auth callback flow
function useBrowserAuthState(): { isComplete: boolean; isProcessingCallback: boolean } {
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const isTauri = !!window.__TAURI__;
    if (isTauri) return;

    if (window.location.search.includes('code=')) {
      setIsProcessingCallback(true);
    }

    if (sessionStorage.getItem('everlast_auth_callback') === 'complete') {
      setIsComplete(true);
      setIsProcessingCallback(false);
      return;
    }

    const checkComplete = () => {
      const complete = sessionStorage.getItem('everlast_auth_callback');
      if (complete === 'complete') {
        setIsComplete(true);
        setIsProcessingCallback(false);
      }
    };

    const interval = setInterval(checkComplete, 100);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsProcessingCallback(false);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return { isComplete, isProcessingCallback };
}

export default function Home() {
  const { isComplete: browserAuthComplete, isProcessingCallback } = useBrowserAuthState();
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const { isAuthenticated, isLoading, isWaitingForAuth, user } = useAuth();
  const { settings } = useSettings();

  // Sessions state
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<FullSession | null>(null);

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const userId = user?.email;

  // Filter and sort sessions
  const filteredSessions = sessions
    .filter(session => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = session.title.toLowerCase().includes(query);
        const matchesPreview = session.preview.toLowerCase().includes(query);
        const matchesTags = session.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesPreview && !matchesTags) return false;
      }

      // Starred filter
      if (showStarredOnly && !session.starred) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const sessionDate = new Date(session.created_at);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          const today = new Date(now);
          sessionDate.setHours(0, 0, 0, 0);
          if (sessionDate.getTime() !== today.getTime()) return false;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (sessionDate < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (sessionDate < monthAgo) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Load sessions on mount and when user changes
  const loadSessions = useCallback(async () => {
    if (!userId) {
      setSessions([]);
      return;
    }

    setSessionsLoading(true);
    try {
      const loaded = await listSessions(userId);
      setSessions(loaded);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      loadSessions();
    }
  }, [isAuthenticated, userId, loadSessions]);

  // Load selected session details
  useEffect(() => {
    if (!selectedSessionId || !userId) {
      setSelectedSession(null);
      return;
    }

    const loadSession = async () => {
      try {
        const session = await getSession(selectedSessionId, userId);
        setSelectedSession(session);
      } catch (error) {
        console.error('Failed to load session:', error);
        setSelectedSession(null);
      }
    };

    loadSession();
  }, [selectedSessionId, userId]);

  const handleRecordingComplete = async (transcription: TranscriptionResult) => {
    setIsProcessing(true);
    setIsRecording(false);

    try {
      // Get API key for cloud providers
      let apiKey: string | undefined;
      let enrichedText = transcription.transcript;

      if (settings.llmProvider === 'openai') {
        apiKey = settings.apiKeys.openai;
      } else if (settings.llmProvider === 'anthropic') {
        apiKey = settings.apiKeys.anthropic;
      }

      // Try to enrich if we have an API key
      if (apiKey) {
        try {
          enrichedText = await enrich(transcription.transcript, {
            provider: settings.llmProvider,
            mode: settings.enrichmentMode,
            apiKey,
            ollamaEndpoint: settings.ollamaEndpoint,
            ollamaModel: settings.ollamaModel,
          });
        } catch (error) {
          console.error('Enrichment failed:', error);
        }
      }

      // Save session and get the full session object
      const session = await saveTranscriptionAsSession(transcription, enrichedText);

      // Navigate directly to session detail
      // Set both states together to avoid async load delay and dashboard flash
      if (session) {
        setSelectedSessionId(session.id);
        setSelectedSession(session);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTranscriptionAsSession = async (
    transcription: TranscriptionResult,
    enrichedContent: string
  ): Promise<FullSession | null> => {
    if (!userId) return null;

    try {
      // Generate title - only if we have actual content
      let title = 'Untitled Recording';
      const hasContent = transcription.transcript && transcription.transcript.trim().length > 10;

      if (hasContent) {
        // Get API key for title generation
        let titleApiKey: string | undefined;
        if (settings.llmProvider === 'openai') {
          titleApiKey = settings.apiKeys.openai;
        } else if (settings.llmProvider === 'anthropic') {
          titleApiKey = settings.apiKeys.anthropic;
        }

        if (titleApiKey || settings.llmProvider === 'ollama') {
          try {
            title = await generateTitle(transcription.transcript, {
              provider: settings.llmProvider,
              apiKey: titleApiKey,
              ollamaEndpoint: settings.ollamaEndpoint,
              ollamaModel: settings.ollamaModel,
            });
          } catch (error) {
            console.error('Title generation failed, using fallback:', error);
            // Fallback to first sentence
            const firstSentence = transcription.transcript.split(/[.!?]/)[0];
            title = firstSentence.length <= 50
              ? firstSentence.trim()
              : firstSentence.slice(0, 50).trim() + '...';
          }
        } else {
          // No LLM configured, use first sentence
          const firstSentence = transcription.transcript.split(/[.!?]/)[0];
          title = firstSentence.length <= 50
            ? firstSentence.trim()
            : firstSentence.slice(0, 50).trim() + '...';
        }
      }

      const session = createSessionFromTranscription(transcription, title || 'Untitled Recording');

      // Add enrichment as a note
      if (enrichedContent !== transcription.transcript) {
        session.enrichments = [{
          id: crypto.randomUUID(),
          type: 'notes',
          content: enrichedContent,
          createdAt: new Date(),
          provider: settings.llmProvider,
        }];
      }

      await saveSession(session, userId);
      await loadSessions(); // Refresh the list

      // Return full session for immediate navigation (avoids async load delay)
      return session;
    } catch (error) {
      console.error('Failed to save session:', error);
      return null;
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!userId) return;

    try {
      await deleteSession(sessionId, userId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setSelectedSession(null);
      }
      // Update locally instead of reloading to preserve scroll position
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleToggleStar = async (sessionId: string, starred: boolean) => {
    if (!userId) return;

    // Update locally first for immediate feedback and to preserve scroll position
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, starred } : s
    ));

    try {
      await updateSessionMetadata(sessionId, { starred }, userId);
    } catch (error) {
      console.error('Failed to update session:', error);
      // Revert on error
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, starred: !starred } : s
      ));
    }
  };

  const handleUpdateTitle = async (title: string) => {
    if (!selectedSessionId || !userId) return;

    try {
      await updateSessionMetadata(selectedSessionId, { title }, userId);
      await loadSessions();
      if (selectedSession) {
        setSelectedSession({ ...selectedSession, title });
      }
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  // Show success message for browser auth
  if (browserAuthComplete) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="animate-scale-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[hsl(var(--success))]/10 shadow-soft">
            <svg className="h-10 w-10 text-[hsl(var(--success))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="animate-fade-in-up stagger-2">
          <h2 className="text-2xl font-semibold">You&apos;re signed in!</h2>
          <p className="mt-2 text-muted-foreground">Authentication was successful.</p>
        </div>
        <div className="animate-fade-in-up stagger-3 rounded-2xl border bg-card p-5 shadow-soft">
          <p className="text-sm text-card-foreground">
            You can now close this tab and return to <strong className="text-primary">Everlast AI Recorder</strong>.
          </p>
        </div>
      </main>
    );
  }

  // Loading state
  if (isLoading || isProcessingCallback) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mic className="h-8 w-8 text-primary animate-gentle-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">
            {isProcessingCallback ? 'Completing sign in...' : 'Loading...'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      </main>
    );
  }

  // Not authenticated - Welcome screen
  if (!isAuthenticated) {
    return (
      <main className="flex h-screen flex-col overflow-hidden">
        {/* Minimal header */}
        <header className="flex shrink-0 items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-soft">
              <Mic className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Everlast AI Recorder</span>
          </div>
          <LoginButton size="sm" />
        </header>

        {/* Hero section */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
          <div className="max-w-lg text-center">
            {/* Icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-soft animate-float">
              <Mic className="h-8 w-8 text-primary" />
            </div>

            {/* Headline */}
            <h1 className="text-3xl font-bold tracking-tight">
              Voice to
              <span className="gradient-text"> Enriched Text</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-3 text-base text-muted-foreground">
              Record, transcribe with speaker detection, and transform your recordings with AI-powered insights.
            </p>

            {/* Features */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>AI Enrichment</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs">
                <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Speaker Detection</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs">
                <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                <span>Multi-language</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6">
              <LoginButton size="lg" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Waiting for auth
  if (isWaitingForAuth) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center text-center p-8">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 shadow-soft">
          <svg className="h-10 w-10 animate-[spin_3s_linear_infinite] text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold">Continue in your browser</h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          A browser window has opened for you to sign in securely.
        </p>
        <div className="mt-8 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
        </div>
      </main>
    );
  }

  // Session detail view
  if (selectedSession) {
    return (
      <main className="flex h-screen flex-col overflow-hidden bg-background">
        {/* Compact header */}
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Mic className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Everlast AI Recorder</span>
          </div>

          <div className="flex items-center gap-3">
            <HotkeyBadge />
            <UserProfile onOpenSettings={() => setSettingsOpen(true)} />
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden">
          <SessionDetail
            session={selectedSession}
            onUpdateTitle={handleUpdateTitle}
            onClose={() => {
              setSelectedSessionId(null);
              setSelectedSession(null);
            }}
            onOpenSettings={(tab) => {
              setSettingsTab(tab);
              setSettingsOpen(true);
            }}
          />
        </div>

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={(open) => {
            setSettingsOpen(open);
            if (!open) setSettingsTab(undefined);
          }}
          defaultTab={settingsTab}
        />
      </main>
    );
  }

  // Main dashboard view
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-soft">
            <Mic className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">Everlast AI Recorder</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Voice to Text</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <HotkeyBadge />
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
          <UserProfile onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          {/* Recorder Section */}
          <section className="mb-12">
            <LiveRecorder
              onRecordingStart={() => setIsRecording(true)}
              onRecordingComplete={handleRecordingComplete}
              onRecordingCancelled={() => setIsRecording(false)}
              onOpenSettings={() => setSettingsOpen(true)}
              isProcessing={isProcessing}
            />
          </section>

          {/* Sessions List - Hidden during recording */}
          {!isRecording && !isProcessing && (
            <section className="animate-fade-in">
              {/* Header with title and controls */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Your Recordings</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {filteredSessions.length === sessions.length
                        ? `${sessions.length} ${sessions.length === 1 ? 'recording' : 'recordings'}`
                        : `${filteredSessions.length} of ${sessions.length} recordings`}
                    </p>
                  </div>

                  {/* Sort toggle */}
                  {sessions.length > 0 && (
                    <button
                      onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
                    </button>
                  )}
                </div>

                {/* Search and filter bar */}
                {sessions.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search input */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search recordings..."
                        className="w-full h-10 pl-9 pr-9 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>

                    {/* Filter buttons */}
                    <div className="flex gap-2">
                      {/* Starred filter */}
                      <button
                        onClick={() => setShowStarredOnly(s => !s)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors',
                          showStarredOnly
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Star className={cn('h-4 w-4', showStarredOnly && 'fill-current')} />
                        <span className="hidden sm:inline">Starred</span>
                      </button>

                      {/* More filters */}
                      <button
                        onClick={() => setShowFilters(f => !f)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors',
                          showFilters || dateFilter !== 'all'
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">Filters</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded filters */}
                {showFilters && sessions.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl border bg-muted/30 animate-fade-in">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground mr-2">Date:</span>
                      {(['all', 'today', 'week', 'month'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setDateFilter(filter)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            dateFilter === filter
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background border hover:bg-muted'
                          )}
                        >
                          {filter === 'all' ? 'All time' : filter === 'today' ? 'Today' : filter === 'week' ? 'This week' : 'This month'}
                        </button>
                      ))}

                      {/* Clear filters */}
                      {(dateFilter !== 'all' || showStarredOnly || searchQuery) && (
                        <button
                          onClick={() => {
                            setDateFilter('all');
                            setShowStarredOnly(false);
                            setSearchQuery('');
                          }}
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <SessionCards
                sessions={filteredSessions}
                isLoading={sessionsLoading}
                onSelectSession={setSelectedSessionId}
                onDeleteSession={handleDeleteSession}
                onToggleStar={handleToggleStar}
              />
            </section>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setSettingsTab(undefined);
        }}
        defaultTab={settingsTab}
      />
    </main>
  );
}

// Hotkey badge component
function HotkeyBadge() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
      <Keyboard className="h-3.5 w-3.5" />
      <span className="mono">{isMac ? '⌘' : 'Ctrl'}+Shift+R</span>
    </div>
  );
}
