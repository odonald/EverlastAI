'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Key, Brain, Mic2, Settings2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiKeySettings } from './api-key-settings';
import { TranscriptionSettings } from './transcription-settings';
import { LLMSettings } from './llm-settings';
import { IntegrationsSettings } from './integrations-settings';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
}

const TABS = [
  { id: 'api-keys', label: 'API Keys', icon: Key, description: 'Manage service keys' },
  { id: 'transcription', label: 'Transcription', icon: Mic2, description: 'Speech-to-text' },
  { id: 'llm', label: 'AI Model', icon: Brain, description: 'LLM settings' },
  { id: 'integrations', label: 'Integrations', icon: Share2, description: 'Export & share' },
];

export function SettingsDialog({ open, onOpenChange, defaultTab }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'api-keys');

  // Update active tab when defaultTab changes
  useEffect(() => {
    if (defaultTab && open) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="animate-scale-in fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b bg-card/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold">Settings</Dialog.Title>
                <p className="text-sm text-muted-foreground">Configure your preferences</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted">
                <X className="h-5 w-5" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <Tabs.Root
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col sm:flex-row"
          >
            {/* Sidebar */}
            <Tabs.List className="flex shrink-0 gap-1 overflow-x-auto border-b bg-muted/30 p-3 sm:w-52 sm:flex-col sm:overflow-x-visible sm:border-b-0 sm:border-r sm:bg-transparent sm:p-4">
              {TABS.map((tab) => (
                <TabTrigger
                  key={tab.id}
                  value={tab.id}
                  icon={tab.icon}
                  description={tab.description}
                >
                  {tab.label}
                </TabTrigger>
              ))}
            </Tabs.List>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <Tabs.Content value="api-keys" className="animate-fade-in">
                <ApiKeySettings />
              </Tabs.Content>
              <Tabs.Content value="transcription" className="animate-fade-in">
                <TranscriptionSettings />
              </Tabs.Content>
              <Tabs.Content value="llm" className="animate-fade-in">
                <LLMSettings />
              </Tabs.Content>
              <Tabs.Content value="integrations" className="animate-fade-in">
                <IntegrationsSettings />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TabTrigger({
  value,
  icon: Icon,
  description,
  children,
}: {
  value: string;
  icon: React.ElementType;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'group flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left transition-all duration-200',
        'text-muted-foreground hover:bg-muted hover:text-foreground',
        'data-[state=active]:shadow-soft data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          'group-data-[state=active]:bg-primary-foreground/20'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="hidden sm:block">
        <div className="text-sm font-medium">{children}</div>
        <div
          className={cn(
            'text-xs transition-colors',
            'text-muted-foreground/70 group-data-[state=active]:text-primary-foreground/70'
          )}
        >
          {description}
        </div>
      </div>
    </Tabs.Trigger>
  );
}
