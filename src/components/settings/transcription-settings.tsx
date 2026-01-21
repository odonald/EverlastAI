'use client';

import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  {
    id: 'deepgram' as const,
    name: 'Deepgram',
    description: 'Fast, accurate real-time transcription with streaming support',
    features: ['Real-time streaming', 'High accuracy', 'Multiple languages'],
    requiresApiKey: true,
    isLocal: false,
  },
  {
    id: 'elevenlabs' as const,
    name: 'ElevenLabs',
    description: 'Advanced speech recognition with natural language processing',
    features: ['Natural processing', 'Context awareness', 'Voice detection'],
    requiresApiKey: true,
    isLocal: false,
  },
  {
    id: 'whisper' as const,
    name: 'Whisper (Local)',
    description: 'OpenAI Whisper running locally - free and private',
    features: ['Free & Open Source', 'Privacy-focused', 'Offline capable'],
    requiresApiKey: false,
    isLocal: true,
  },
];

export function TranscriptionSettings() {
  const { settings, updateSettings, saveSettings, isSaving } = useSettings();

  const handleProviderChange = (provider: 'deepgram' | 'elevenlabs' | 'whisper') => {
    updateSettings({ transcriptionProvider: provider });
  };

  const canSelectProvider = (provider: typeof PROVIDERS[number]) => {
    if (provider.isLocal) return true;
    if (provider.id === 'deepgram') return !!settings.apiKeys.deepgram;
    if (provider.id === 'elevenlabs') return !!settings.apiKeys.elevenlabs;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Transcription Settings</h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred speech-to-text provider.
        </p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map((provider) => {
          const isSelected = settings.transcriptionProvider === provider.id;
          const canSelect = canSelectProvider(provider);

          return (
            <button
              key={provider.id}
              onClick={() => handleProviderChange(provider.id)}
              disabled={!canSelect}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-border hover:border-primary/50',
                !canSelect && 'cursor-not-allowed opacity-50'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{provider.name}</h4>
                    {provider.isLocal && (
                      <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                        Local
                      </span>
                    )}
                    {provider.requiresApiKey && !canSelect && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        No API key
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{provider.description}</p>
                </div>
                <div
                  className={cn(
                    'h-4 w-4 rounded-full border-2',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                  )}
                >
                  {isSelected && (
                    <div className="h-full w-full rounded-full bg-primary-foreground scale-50" />
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {provider.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Whisper endpoint configuration */}
      {settings.transcriptionProvider === 'whisper' && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <label className="text-sm font-medium">Whisper Server Endpoint</label>
          <input
            type="text"
            value={settings.whisperEndpoint}
            onChange={(e) => updateSettings({ whisperEndpoint: e.target.value })}
            placeholder="http://localhost:8080"
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
          />
          <p className="text-xs text-muted-foreground">
            Run a local Whisper server using faster-whisper-server, whisper.cpp, or LocalAI
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
