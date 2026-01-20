'use client';

import { useState } from 'react';
import { VoiceRecorder } from '@/components/voice/voice-recorder';
import { OutputDisplay } from '@/components/output/output-display';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { HotkeyIndicator } from '@/components/ui/hotkey-indicator';
import { useAuth } from '@/hooks/use-auth';
import { LoginButton } from '@/components/auth/login-button';
import { Settings, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [output, setOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();

  const handleTranscriptionComplete = async (transcription: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcription }),
      });
      const data = await response.json();
      setOutput(data.enrichedText);
    } catch (error) {
      console.error('Enrichment failed:', error);
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
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Mic className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">EverlastAI</h1>
            <p className="text-sm text-muted-foreground">Voice to Enriched Text</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <HotkeyIndicator />
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
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
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
        {!isAuthenticated ? (
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-semibold">Welcome to EverlastAI</h2>
            <p className="mb-6 text-muted-foreground">
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
