'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Key, Brain, Mic2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiKeySettings } from './api-key-settings';
import { TranscriptionSettings } from './transcription-settings';
import { LLMSettings } from './llm-settings';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState('api-keys');
  const { logout, user } = useAuth();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-0 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <Dialog.Title className="text-lg font-semibold">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex">
            {/* Sidebar */}
            <Tabs.List className="flex w-48 flex-col gap-1 border-r p-4">
              <TabTrigger value="api-keys" icon={Key}>
                API Keys
              </TabTrigger>
              <TabTrigger value="transcription" icon={Mic2}>
                Transcription
              </TabTrigger>
              <TabTrigger value="llm" icon={Brain}>
                LLM Settings
              </TabTrigger>

              {/* Logout */}
              <div className="mt-auto pt-4">
                <div className="mb-3 border-t pt-3 text-xs text-muted-foreground">
                  {user?.email}
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </Tabs.List>

            {/* Content */}
            <div className="flex-1 p-6">
              <Tabs.Content value="api-keys">
                <ApiKeySettings />
              </Tabs.Content>
              <Tabs.Content value="transcription">
                <TranscriptionSettings />
              </Tabs.Content>
              <Tabs.Content value="llm">
                <LLMSettings />
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
  children,
}: {
  value: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
        'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Tabs.Trigger>
  );
}
