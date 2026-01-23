'use client';

import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Zap, Shield, Globe, Mic2, Server } from 'lucide-react';

const PROVIDERS = [
  {
    id: 'deepgram' as const,
    name: 'Deepgram',
    description: 'Fast, accurate real-time transcription with streaming support',
    features: ['Real-time streaming', 'Speaker detection', '30+ languages'],
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    requiresApiKey: true,
    isLocal: false,
  },
  {
    id: 'elevenlabs' as const,
    name: 'ElevenLabs',
    description: 'Advanced speech recognition with natural language processing',
    features: ['Context awareness', 'Voice detection', 'High fidelity'],
    icon: Globe,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    requiresApiKey: true,
    isLocal: false,
  },
  {
    id: 'whisper' as const,
    name: 'Whisper (Local)',
    description: 'OpenAI Whisper running locally - free and completely private',
    features: ['Free forever', 'Privacy-focused', 'Offline capable'],
    icon: Shield,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    requiresApiKey: false,
    isLocal: true,
  },
];

export function TranscriptionSettings() {
  const { settings, updateSettings, saveSettings, isSaving } = useSettings();

  const handleProviderChange = (provider: 'deepgram' | 'elevenlabs' | 'whisper') => {
    updateSettings({ transcriptionProvider: provider });
  };

  const canSelectProvider = (provider: (typeof PROVIDERS)[number]) => {
    if (provider.isLocal) return true;
    if (provider.id === 'deepgram') return !!settings.apiKeys.deepgram;
    if (provider.id === 'elevenlabs') return !!settings.apiKeys.elevenlabs;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Transcription</h3>
        <p className="mt-1 text-muted-foreground">Choose your preferred speech-to-text provider.</p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map((provider, index) => {
          const isSelected = settings.transcriptionProvider === provider.id;
          const canSelect = canSelectProvider(provider);
          const Icon = provider.icon;

          return (
            <button
              key={provider.id}
              onClick={() => canSelect && handleProviderChange(provider.id)}
              disabled={!canSelect}
              className={cn(
                'animate-fade-in-up w-full rounded-2xl border p-5 text-left transition-all duration-300',
                isSelected
                  ? 'shadow-soft border-primary bg-primary/5 ring-2 ring-primary/30'
                  : 'hover:shadow-soft border-border hover:border-primary/30',
                !canSelect && 'cursor-not-allowed opacity-50'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl',
                    provider.bgColor
                  )}
                >
                  <Icon className={cn('h-6 w-6', provider.color)} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{provider.name}</h4>
                    {provider.isLocal && (
                      <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                        Local
                      </span>
                    )}
                    {provider.requiresApiKey && !canSelect && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        No API key
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{provider.description}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {provider.features.map((feature) => (
                      <span
                        key={feature}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Selection indicator */}
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Whisper endpoint configuration */}
      {settings.transcriptionProvider === 'whisper' && (
        <div className="animate-scale-in space-y-4 rounded-2xl border bg-gradient-to-r from-green-500/5 to-transparent p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
              <Server className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <label className="font-medium">Whisper Server Endpoint</label>
              <p className="text-sm text-muted-foreground">Configure your local Whisper server</p>
            </div>
          </div>
          <input
            type="text"
            value={settings.whisperEndpoint}
            onChange={(e) => updateSettings({ whisperEndpoint: e.target.value })}
            placeholder="http://localhost:8080"
            className={cn(
              'w-full rounded-xl border bg-background px-4 py-3 text-sm',
              'placeholder:text-muted-foreground/50',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
              'transition-all duration-200'
            )}
          />
          <p className="text-xs text-muted-foreground">
            Run a local Whisper server using{' '}
            <code className="mono rounded bg-muted px-1.5 py-0.5">faster-whisper-server</code>,{' '}
            <code className="mono rounded bg-muted px-1.5 py-0.5">whisper.cpp</code>, or LocalAI
          </p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={saveSettings} disabled={isSaving} className="rounded-xl px-6">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
