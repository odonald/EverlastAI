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
        <Dialog.Content className="fixed inset-2 z-50 flex flex-col rounded-xl border bg-background p-0 shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
            <Dialog.Title className="text-base font-semibold sm:text-lg">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Tabs */}
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col sm:flex-row">
            {/* Sidebar - horizontal on mobile, vertical on desktop */}
            <Tabs.List className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:w-44 sm:flex-col sm:overflow-x-visible sm:border-b-0 sm:border-r sm:p-4 md:w-48">
              <TabTrigger value="api-keys" icon={Key}>
                API Keys
              </TabTrigger>
              <TabTrigger value="transcription" icon={Mic2}>
                Transcription
              </TabTrigger>
              <TabTrigger value="llm" icon={Brain}>
                LLM
              </TabTrigger>

              {/* Logout - hidden on mobile, shown in sidebar on desktop */}
              <div className="mt-auto hidden pt-4 sm:block">
                <div className="mb-3 truncate border-t pt-3 text-xs text-muted-foreground">
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
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
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

            {/* Mobile logout button */}
            <div className="shrink-0 border-t p-4 sm:hidden">
              <Button
                variant="ghost"
                className="w-full justify-center gap-2 text-destructive hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
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
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium sm:gap-2 sm:px-3 sm:py-2 sm:text-sm',
        'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      {children}
    </Tabs.Trigger>
  );
}
