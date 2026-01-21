'use client';

import { useState } from 'react';
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

interface ApiKeyInputProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function ApiKeyInput({ label, description, value, onChange, placeholder }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const hasKey = value.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {hasKey && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <Check className="h-3 w-3" />
            Configured
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary'
          )}
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ApiKeySettings() {
  const { settings, updateSettings, saveSettings, isSaving } = useSettings();

  const handleSave = async () => {
    await saveSettings();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Configure your API keys for transcription and AI services.
        </p>
      </div>

      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-yellow-500" />
          <div className="text-sm">
            <p className="font-medium text-yellow-500">Security Notice</p>
            <p className="text-muted-foreground">
              API keys are stored locally on your device and never sent to our servers.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Transcription APIs */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Transcription Services</h4>

          <ApiKeyInput
            label="Deepgram API Key"
            description="Used for real-time speech-to-text transcription"
            value={settings.apiKeys.deepgram}
            onChange={(value) => updateSettings({ apiKeys: { ...settings.apiKeys, deepgram: value } })}
            placeholder="Enter your Deepgram API key"
          />

          <ApiKeyInput
            label="ElevenLabs API Key"
            description="Alternative transcription provider"
            value={settings.apiKeys.elevenlabs}
            onChange={(value) => updateSettings({ apiKeys: { ...settings.apiKeys, elevenlabs: value } })}
            placeholder="Enter your ElevenLabs API key"
          />
        </div>

        {/* LLM APIs */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">AI/LLM Services</h4>

          <ApiKeyInput
            label="OpenAI API Key"
            description="Used for GPT-4 text enrichment"
            value={settings.apiKeys.openai}
            onChange={(value) => updateSettings({ apiKeys: { ...settings.apiKeys, openai: value } })}
            placeholder="sk-..."
          />

          <ApiKeyInput
            label="Anthropic API Key"
            description="Used for Claude text enrichment"
            value={settings.apiKeys.anthropic}
            onChange={(value) => updateSettings({ apiKeys: { ...settings.apiKeys, anthropic: value } })}
            placeholder="sk-ant-..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
