'use client';

import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    model: 'GPT-4',
    description: 'Powerful general-purpose language model with excellent reasoning',
    features: ['Advanced reasoning', 'Code understanding', 'Creative writing'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    model: 'Claude',
    description: 'Thoughtful AI assistant with strong analytical capabilities',
    features: ['Long context', 'Careful analysis', 'Structured output'],
  },
] as const;

const ENRICHMENT_MODES = [
  { id: 'auto', name: 'Auto-detect', description: 'Automatically determine the best format' },
  { id: 'notes', name: 'Structured Notes', description: 'Bullet points and sections' },
  { id: 'summary', name: 'Summary', description: 'Concise summary of key points' },
  { id: 'action-items', name: 'Action Items', description: 'Extract tasks and to-dos' },
  { id: 'format', name: 'Clean Format', description: 'Clean up grammar and formatting' },
] as const;

export function LLMSettings() {
  const { settings, updateSettings, saveSettings, isSaving } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">LLM Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure AI model and enrichment preferences.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">AI Provider</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROVIDERS.map((provider) => {
            const isSelected = settings.llmProvider === provider.id;
            const hasKey = settings.apiKeys[provider.id as keyof typeof settings.apiKeys];

            return (
              <button
                key={provider.id}
                onClick={() => updateSettings({ llmProvider: provider.id })}
                disabled={!hasKey}
                className={cn(
                  'rounded-lg border p-4 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50',
                  !hasKey && 'cursor-not-allowed opacity-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <p className="text-xs text-muted-foreground">{provider.model}</p>
                  </div>
                  {!hasKey && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">No key</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Enrichment Mode */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Enrichment Mode</h4>
        <div className="space-y-2">
          {ENRICHMENT_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => updateSettings({ enrichmentMode: mode.id })}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                settings.enrichmentMode === mode.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div
                className={cn(
                  'h-4 w-4 rounded-full border-2',
                  settings.enrichmentMode === mode.id
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                )}
              />
              <div>
                <div className="font-medium">{mode.name}</div>
                <div className="text-xs text-muted-foreground">{mode.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
