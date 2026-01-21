'use client';

import { useState, useEffect } from 'react';
import { VoiceRecorder } from '@/components/voice/voice-recorder';
import { OutputDisplay } from '@/components/output/output-display';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { HotkeyIndicator } from '@/components/ui/hotkey-indicator';
import { useAuth } from '@/hooks/use-auth';
import { useSettings } from '@/hooks/use-settings';
import { LoginButton } from '@/components/auth/login-button';
import { Settings, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { enrich } from '@/lib/llm';

// Check if browser completed auth for Tauri app
function useBrowserAuthComplete(): boolean {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Only run in browser, not in Tauri
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
    if (isTauri) return;

    // Check on mount and also listen for storage changes
    const checkComplete = () => {
      const complete = sessionStorage.getItem('everlast_auth_callback');
      if (complete === 'complete') {
        setIsComplete(true);
      }
    };

    checkComplete();

    // Also poll briefly in case the flag is set after initial render
    const interval = setInterval(checkComplete, 100);
    setTimeout(() => clearInterval(interval), 2000);

    return () => clearInterval(interval);
  }, []);

  return isComplete;
}

export default function Home() {
  const browserAuthComplete = useBrowserAuthComplete();
  const [output, setOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isAuthenticated, isLoading, isWaitingForAuth, user } = useAuth();
  const { settings } = useSettings();

  const handleTranscriptionComplete = async (transcription: string) => {
    setIsProcessing(true);
    try {
      // Get API key for cloud providers
      let apiKey: string | undefined;
      if (settings.llmProvider === 'openai') {
        apiKey = settings.apiKeys.openai;
        if (!apiKey) {
          setOutput(transcription);
          setIsProcessing(false);
          return;
        }
      } else if (settings.llmProvider === 'anthropic') {
        apiKey = settings.apiKeys.anthropic;
        if (!apiKey) {
          setOutput(transcription);
          setIsProcessing(false);
          return;
        }
      }
      // Ollama doesn't need an API key
      const enrichedText = await enrich(transcription, {
        provider: settings.llmProvider,
        mode: settings.enrichmentMode,
        apiKey,
        ollamaEndpoint: settings.ollamaEndpoint,
        ollamaModel: settings.ollamaModel,
      });
      setOutput(enrichedText);
    } catch (error) {
      console.error('Enrichment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Enrichment failed: ${errorMessage}`);
      setOutput(transcription);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show success message when browser completed auth for Tauri app
  if (browserAuthComplete) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-background to-muted/30 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 shadow-lg">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">You&apos;re signed in!</h2>
          <p className="mt-2 text-muted-foreground">Authentication was successful.</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <p className="text-sm text-card-foreground">
            You can now close this tab and return to <strong>EverlastAI</strong>.
          </p>
        </div>
        <p className="text-xs text-muted-foreground/60">
          The app will automatically update to show you signed in.
        </p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary sm:h-10 sm:w-10 sm:rounded-xl">
            <Mic className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold sm:text-xl">EverlastAI</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">Voice to Enriched Text</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:block">
            <HotkeyIndicator />
          </div>
          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden text-sm text-muted-foreground lg:block">{user?.email}</span>
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6 md:gap-8 md:p-8">
        {isWaitingForAuth ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-8 w-8 animate-pulse text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold">Continue in your browser</h2>
            <p className="mb-4 max-w-md text-sm text-muted-foreground">
              A browser window has opened for you to sign in securely.
            </p>
            <div className="rounded-lg border bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                This window will automatically update once you&apos;re signed in.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h2 className="mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl">Welcome to EverlastAI</h2>
            <p className="mb-4 max-w-md text-sm text-muted-foreground sm:mb-6 sm:text-base">
              Sign in to start transforming your voice into structured content.
            </p>
            <LoginButton />
          </div>
        ) : (
          <>
            <VoiceRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              isProcessing={isProcessing}
              onOpenSettings={() => setSettingsOpen(true)}
            />
            <OutputDisplay content={output} isLoading={isProcessing} />
          </>
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  );
}
