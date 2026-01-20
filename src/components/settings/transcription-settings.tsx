'use client';

import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  {
    id: 'deepgram',
    name: 'Deepgram',
    description: 'Fast, accurate real-time transcription with streaming support',
    features: ['Real-time streaming', 'High accuracy', 'Multiple languages'],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Advanced speech recognition with natural language processing',
    features: ['Natural processing', 'Context awareness', 'Voice detection'],
  },
] as const;

export function TranscriptionSettings() {
  const { settings, updateSettings, saveSettings, isSaving } = useSettings();

  const handleProviderChange = (provider: typeof PROVIDERS[number]['id']) => {
    updateSettings({ transcriptionProvider: provider });
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
          const hasKey = settings.apiKeys[provider.id as keyof typeof settings.apiKeys];

          return (
            <button
              key={provider.id}
              onClick={() => handleProviderChange(provider.id)}
              disabled={!hasKey}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-border hover:border-primary/50',
                !hasKey && 'cursor-not-allowed opacity-50'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{provider.name}</h4>
                    {!hasKey && (
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

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
