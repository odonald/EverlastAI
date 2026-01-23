'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Check,
  Shield,
  Loader2,
  ShieldCheck,
  ShieldX,
  Mic2,
  Brain,
} from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

type ProviderType = 'deepgram' | 'openai' | 'anthropic' | 'elevenlabs';

interface ValidationResult {
  valid: boolean;
  error?: string;
  info?: Record<string, unknown>;
}

// Validate through API route to avoid CORS issues
async function validateProvider(provider: ProviderType, key: string): Promise<ValidationResult> {
  try {
    const response = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, key }),
    });
    return await response.json();
  } catch {
    return { valid: false, error: 'Validation request failed' };
  }
}

interface ApiKeyInputProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  provider: ProviderType;
}

function ApiKeyInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  provider,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidatedValue = useRef<string>('');
  const hasKey = value.length > 0;

  // Auto-validate when value changes (debounced)
  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Skip if empty or same as last validated
    if (!value || value === lastValidatedValue.current) {
      if (!value) {
        setValidationResult(null);
        lastValidatedValue.current = '';
      }
      return;
    }

    // Clear old result while typing
    setValidationResult(null);

    // Debounce validation (800ms after user stops typing)
    debounceRef.current = setTimeout(async () => {
      setIsValidating(true);
      try {
        const result = await validateProvider(provider, value);
        setValidationResult(result);
        lastValidatedValue.current = value;
      } catch {
        setValidationResult({ valid: false, error: 'Validation failed' });
      } finally {
        setIsValidating(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, provider]);

  return (
    <div className="hover:shadow-soft group rounded-2xl border bg-card p-4 transition-all duration-200 hover:border-primary/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <label className="font-medium">{label}</label>
            {/* Status indicator */}
            {isValidating && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking...
              </span>
            )}
            {!isValidating && validationResult?.valid && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-600 dark:text-green-400">
                <ShieldCheck className="h-3 w-3" />
                Valid
              </span>
            )}
            {!isValidating && validationResult?.valid === false && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
                <ShieldX className="h-3 w-3" />
                Invalid
              </span>
            )}
            {!isValidating && !validationResult && hasKey && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3" />
                Configured
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="relative mt-3">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm transition-all duration-200',
            'placeholder:text-muted-foreground/50',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
            validationResult?.valid === true && 'border-green-500/50 bg-green-500/5',
            validationResult?.valid === false && 'border-destructive/50 bg-destructive/5'
          )}
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {validationResult?.error && (
        <p className="animate-fade-in mt-2 text-sm text-destructive">{validationResult.error}</p>
      )}
      {validationResult?.valid && validationResult.info && (
        <p className="animate-fade-in mt-2 text-sm text-green-600 dark:text-green-400">
          {formatValidationInfo(provider, validationResult.info)}
        </p>
      )}
    </div>
  );
}

function formatValidationInfo(provider: ProviderType, info: Record<string, unknown>): string {
  switch (provider) {
    case 'deepgram':
      return info.projectName ? `Project: ${info.projectName}` : 'API key validated';
    case 'elevenlabs':
      return info.subscription
        ? `Subscription: ${info.subscription} (${info.characterCount}/${info.characterLimit} chars)`
        : 'API key validated';
    case 'openai':
      return info.rateLimited ? 'Valid (currently rate limited)' : 'API key validated';
    case 'anthropic':
      return info.rateLimited ? 'Valid (currently rate limited)' : 'API key validated';
    default:
      return 'Validated';
  }
}

export function ApiKeySettings() {
  const { settings, updateSettings, isSaving } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">API Keys</h3>
        <p className="mt-1 text-muted-foreground">
          Configure your API keys for transcription and AI services.
        </p>
      </div>

      {/* Security notice */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent p-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-300">Security Notice</p>
            <p className="mt-1 text-sm text-muted-foreground">
              API keys are encrypted and stored locally on your device. They are never sent to our
              servers.
            </p>
          </div>
        </div>
      </div>

      {/* Transcription APIs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Transcription Services
          </h4>
        </div>

        <ApiKeyInput
          label="Deepgram"
          description="Real-time speech-to-text with speaker detection"
          value={settings.apiKeys.deepgram}
          onChange={(value) =>
            updateSettings({ apiKeys: { ...settings.apiKeys, deepgram: value } })
          }
          placeholder="Enter your Deepgram API key"
          provider="deepgram"
        />

        <ApiKeyInput
          label="ElevenLabs"
          description="Alternative transcription provider with NLP"
          value={settings.apiKeys.elevenlabs}
          onChange={(value) =>
            updateSettings({ apiKeys: { ...settings.apiKeys, elevenlabs: value } })
          }
          placeholder="Enter your ElevenLabs API key"
          provider="elevenlabs"
        />
      </div>

      {/* LLM APIs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            AI / LLM Services
          </h4>
        </div>

        <ApiKeyInput
          label="OpenAI"
          description="GPT-5 for text enrichment and summaries"
          value={settings.apiKeys.openai}
          onChange={(value) => updateSettings({ apiKeys: { ...settings.apiKeys, openai: value } })}
          placeholder="sk-..."
          provider="openai"
        />

        <ApiKeyInput
          label="Anthropic"
          description="Claude for thoughtful text analysis"
          value={settings.apiKeys.anthropic}
          onChange={(value) =>
            updateSettings({ apiKeys: { ...settings.apiKeys, anthropic: value } })
          }
          placeholder="sk-ant-..."
          provider="anthropic"
        />
      </div>

      {isSaving && (
        <div className="animate-fade-in flex items-center justify-center gap-2 rounded-xl bg-muted/50 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving changes...
        </div>
      )}
    </div>
  );
}
