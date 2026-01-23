'use client';

import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Sparkles, Brain, Shield, Server } from 'lucide-react';

const PROVIDERS = [
  {
    id: 'openai' as const,
    name: 'OpenAI',
    model: 'GPT-5',
    description: 'Powerful general-purpose language model with excellent reasoning',
    features: ['Advanced reasoning', 'Code understanding', 'Creative writing'],
    icon: Sparkles,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    requiresApiKey: true,
    isLocal: false,
  },
  {
    id: 'anthropic' as const,
    name: 'Anthropic',
    model: 'Claude',
    description: 'Thoughtful AI assistant with strong analytical capabilities',
    features: ['Long context', 'Careful analysis', 'Structured output'],
    icon: Brain,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    requiresApiKey: true,
    isLocal: false,
  },
  {
    id: 'ollama' as const,
    name: 'Ollama (Local)',
    model: 'Llama, Mistral, etc.',
    description: 'Run open source LLMs locally - free and completely private',
    features: ['Free forever', 'Privacy-focused', 'Many models'],
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    requiresApiKey: false,
    isLocal: true,
  },
];

export function LLMSettings() {
  const { settings, updateSettings, saveSettings, isSaving } = useSettings();

  const canSelectProvider = (provider: (typeof PROVIDERS)[number]) => {
    if (provider.isLocal) return true;
    if (provider.id === 'openai') return !!settings.apiKeys.openai;
    if (provider.id === 'anthropic') return !!settings.apiKeys.anthropic;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">AI Model</h3>
        <p className="mt-1 text-muted-foreground">
          Choose your preferred LLM for text enrichment and AI actions.
        </p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map((provider, index) => {
          const isSelected = settings.llmProvider === provider.id;
          const canSelect = canSelectProvider(provider);
          const Icon = provider.icon;

          return (
            <button
              key={provider.id}
              onClick={() => canSelect && updateSettings({ llmProvider: provider.id })}
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
                  <p className="mt-0.5 text-xs text-muted-foreground/70">{provider.model}</p>
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

      {/* Ollama configuration */}
      {settings.llmProvider === 'ollama' && (
        <div className="animate-scale-in space-y-4 rounded-2xl border bg-gradient-to-r from-blue-500/5 to-transparent p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Server className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <span className="font-medium">Ollama Configuration</span>
              <p className="text-sm text-muted-foreground">Configure your local Ollama server</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Endpoint</label>
              <input
                type="text"
                value={settings.ollamaEndpoint}
                onChange={(e) => updateSettings({ ollamaEndpoint: e.target.value })}
                placeholder="http://localhost:11434"
                className={cn(
                  'w-full rounded-xl border bg-background px-4 py-3 text-sm',
                  'placeholder:text-muted-foreground/50',
                  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'transition-all duration-200'
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model Name</label>
              <input
                type="text"
                value={settings.ollamaModel}
                onChange={(e) => updateSettings({ ollamaModel: e.target.value })}
                placeholder="llama3.2"
                className={cn(
                  'w-full rounded-xl border bg-background px-4 py-3 text-sm',
                  'placeholder:text-muted-foreground/50',
                  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'transition-all duration-200'
                )}
              />
              <p className="text-xs text-muted-foreground">
                Run{' '}
                <code className="mono rounded bg-muted px-1.5 py-0.5">ollama pull llama3.2</code> to
                download a model
              </p>
            </div>
          </div>
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
