'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings, type NotionConnection } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Webhook,
  ExternalLink,
  Check,
  X,
  Loader2,
  FileText,
  Link2,
  Unlink,
  Globe,
} from 'lucide-react';

// Check if running in Tauri
const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI__;

// Notion logo as inline SVG
function NotionLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" />
      <path
        fill="white"
        d="M61.35 36.077c0 2.127-.18 2.127-1.26 2.867l-7.92 5.4v36.487c0 2.013-.45 3.147-1.89 3.147-.9 0-1.8-.45-2.7-1.35l-8.55-11.07c-2.7-3.51-3.87-5.4-3.87-8.55V39.77l-7.38-5.22c-.9-.63-1.08-1.08-1.08-2.16 0-1.53 1.17-2.7 3.06-2.88l28.53-1.71c1.8-.09 2.79.36 2.79 2.16v6.127h.27zM44.737 9.597l40.32-2.97c4.95-.36 6.21.78 6.21 4.86v56.34c0 3.33-1.71 5.22-5.4 5.49l-42.93 2.61c-2.79.18-4.14-.36-5.49-2.07l-12.42-16.11c-1.53-1.98-2.16-3.42-2.16-5.13V15.637c0-3.15 1.26-5.67 5.13-5.94l16.74-.1z"
      />
    </svg>
  );
}

export function IntegrationsSettings() {
  const { settings, updateSettings } = useSettings();
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [webhookError, setWebhookError] = useState<string | null>(null);

  // Notion auth state
  const [isWaitingForNotion, setIsWaitingForNotion] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Sync local state with settings
  useEffect(() => {
    setWebhookUrl(settings.webhookUrl);
  }, [settings.webhookUrl]);

  // Check for Notion token via session API (polling for external browser auth)
  const checkForNotionToken = useCallback(async () => {
    // First try cookie (for same-context flows)
    const tokenCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('notion_token_data='));

    if (tokenCookie) {
      try {
        const tokenData = JSON.parse(decodeURIComponent(tokenCookie.split('=')[1]));
        const notionConnection: NotionConnection = {
          accessToken: tokenData.access_token,
          workspaceId: tokenData.workspace_id,
          workspaceName: tokenData.workspace_name,
          workspaceIcon: tokenData.workspace_icon,
        };

        updateSettings({ notion: notionConnection });
        document.cookie = 'notion_token_data=; Max-Age=0; path=/';
        setIsWaitingForNotion(false);
        setNotionError(null);

        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return true;
      } catch (e) {
        console.error('Failed to parse Notion token from cookie:', e);
      }
    }

    // For Tauri, poll the session API
    if (sessionIdRef.current) {
      try {
        const response = await fetch(`/api/notion/session?sessionId=${sessionIdRef.current}`);
        const data = await response.json();

        if (data.found && data.tokenData) {
          const notionConnection: NotionConnection = {
            accessToken: data.tokenData.access_token,
            workspaceId: data.tokenData.workspace_id,
            workspaceName: data.tokenData.workspace_name,
            workspaceIcon: data.tokenData.workspace_icon,
          };

          updateSettings({ notion: notionConnection });
          setIsWaitingForNotion(false);
          setNotionError(null);

          // Clean up the session
          await fetch(`/api/notion/session?sessionId=${sessionIdRef.current}`, {
            method: 'DELETE',
          });
          sessionIdRef.current = null;

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          return true;
        }
      } catch (e) {
        console.error('Failed to check Notion session:', e);
      }
    }

    return false;
  }, [updateSettings]);

  // Check for Notion OAuth callback (for non-Tauri browser flow)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const notionConnected = params.get('notion_connected');
    const notionErrorParam = params.get('notion_error');

    if (notionErrorParam) {
      setNotionError(notionErrorParam);
      setIsWaitingForNotion(false);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (notionConnected === 'true') {
      checkForNotionToken();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkForNotionToken]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleWebhookSave = () => {
    updateSettings({ webhookUrl });
    setWebhookStatus('idle');
  };

  const handleWebhookTest = async () => {
    if (!webhookUrl) {
      setWebhookError('Please enter a webhook URL');
      return;
    }

    setWebhookStatus('testing');
    setWebhookError(null);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          message: 'Test from Everlast AI Recorder',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setWebhookStatus('success');
        setTimeout(() => setWebhookStatus('idle'), 3000);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setWebhookStatus('error');
      setWebhookError(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const handleNotionConnect = async () => {
    setNotionError(null);

    // Generate a unique session ID for cross-context token transfer
    const sessionId = crypto.randomUUID();
    sessionIdRef.current = sessionId;

    try {
      // Call POST endpoint to get the auth URL
      const response = await fetch('/api/notion/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start Notion auth');
      }

      const { authUrl } = await response.json();

      if (isTauri()) {
        // Open in external browser for Tauri
        setIsWaitingForNotion(true);

        // Open in external browser
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(authUrl);

        // Start polling for the token via session API
        pollingRef.current = setInterval(() => {
          checkForNotionToken();
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (isWaitingForNotion) {
            setIsWaitingForNotion(false);
            setNotionError('Connection timed out. Please try again.');
          }
        }, 5 * 60 * 1000);
      } else {
        // Standard redirect for browser
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Failed to start Notion auth:', error);
      setIsWaitingForNotion(false);
      setNotionError(error instanceof Error ? error.message : 'Failed to start Notion auth. Please try again.');
    }
  };

  const handleNotionCancel = () => {
    setIsWaitingForNotion(false);
    sessionIdRef.current = null;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleNotionDisconnect = () => {
    updateSettings({ notion: null });
  };

  const isNotionConfigured = !!process.env.NEXT_PUBLIC_NOTION_ENABLED;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold">Integrations</h3>
        <p className="mt-1 text-muted-foreground">
          Connect external services to export and share your transcripts.
        </p>
      </div>

      {/* Webhook Integration */}
      <div className="space-y-4 rounded-2xl border p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
            <Webhook className="h-6 w-6 text-violet-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">Webhook</h4>
            <p className="text-sm text-muted-foreground">
              Send transcripts to Zapier, n8n, Make, or any custom endpoint
            </p>
          </div>
          {settings.webhookUrl && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              Configured
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/... or your endpoint"
              className={cn(
                'w-full rounded-xl border bg-background px-4 py-3 text-sm',
                'placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'transition-all duration-200'
              )}
            />
          </div>

          {webhookError && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <X className="h-4 w-4" />
              {webhookError}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWebhookTest}
              disabled={!webhookUrl || webhookStatus === 'testing'}
              className="rounded-xl"
            >
              {webhookStatus === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {webhookStatus === 'success' && <Check className="mr-2 h-4 w-4 text-emerald-500" />}
              {webhookStatus === 'error' && <X className="mr-2 h-4 w-4 text-destructive" />}
              Test Webhook
            </Button>
            <Button
              size="sm"
              onClick={handleWebhookSave}
              disabled={webhookUrl === settings.webhookUrl}
              className="rounded-xl"
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Notion Integration */}
      <div className="space-y-4 rounded-2xl border p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 dark:bg-neutral-100">
            <NotionLogo className="h-6 w-6 text-white dark:text-neutral-900" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold">Notion</h4>
            <p className="text-sm text-muted-foreground">
              Export transcripts directly to your Notion workspace
            </p>
          </div>
          {settings.notion && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              Connected
            </span>
          )}
        </div>

        {settings.notion ? (
          <div className="space-y-4">
            {/* Connected workspace info */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              {settings.notion.workspaceIcon && (
                <span className="text-2xl">{settings.notion.workspaceIcon}</span>
              )}
              <div className="flex-1">
                <p className="font-medium">{settings.notion.workspaceName}</p>
                <p className="text-xs text-muted-foreground">
                  Workspace connected
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNotionDisconnect}
                className="rounded-xl text-muted-foreground hover:text-destructive"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>

            {/* Parent page selection info */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Note:</strong> When exporting, you&apos;ll be asked to enter a Notion page ID
                where your transcripts will be created as subpages.
              </p>
            </div>
          </div>
        ) : isWaitingForNotion ? (
          /* Waiting for Notion auth in browser */
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-xl bg-primary/5 border border-primary/20 p-6 text-center">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Globe className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" />
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Continue in your browser</h4>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  A browser window has opened for you to connect your Notion account.
                  Return here when you&apos;re done.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNotionCancel}
                className="rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {notionError && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <X className="h-4 w-4 shrink-0" />
                {notionError}
              </div>
            )}

            {isNotionConfigured ? (
              <Button onClick={handleNotionConnect} className="rounded-xl gap-2">
                <Link2 className="h-4 w-4" />
                Connect Notion
              </Button>
            ) : (
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Notion integration requires configuration. Add{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NOTION_CLIENT_ID</code> and{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NOTION_CLIENT_SECRET</code>{' '}
                  to your environment variables.
                </p>
                <a
                  href="https://developers.notion.com/docs/create-a-notion-integration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Learn how to create a Notion integration
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Future integrations placeholder */}
      <div className="rounded-2xl border border-dashed p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-muted-foreground">More coming soon</h4>
            <p className="text-sm text-muted-foreground">
              Google Drive, Slack, and more integrations are on the way
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
