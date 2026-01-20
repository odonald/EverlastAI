'use client';

import { useState } from 'react';
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

export default function Home() {
  const [output, setOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const { settings } = useSettings();

  const handleTranscriptionComplete = async (transcription: string) => {
    setIsProcessing(true);
    try {
      const apiKey = settings.llmProvider === 'openai'
        ? settings.apiKeys.openai
        : settings.apiKeys.anthropic;

      if (!apiKey) {
        console.warn('No LLM API key configured, showing raw transcription');
        setOutput(transcription);
        return;
      }

      console.log('Enriching with provider:', settings.llmProvider, 'mode:', settings.enrichmentMode);
      const enrichedText = await enrich(transcription, {
        provider: settings.llmProvider,
        mode: settings.enrichmentMode,
        apiKey,
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
        {!isAuthenticated ? (
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
