'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function NotionCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Notion...');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        setStatus('error');
        setMessage(`Notion authorization failed: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        return;
      }

      try {
        // Exchange the code for a token via POST API
        const response = await fetch('/api/notion/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
          credentials: 'include', // Include cookies for CSRF verification
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to connect to Notion');
        }

        setWorkspaceName(data.workspaceName || '');
        setStatus('success');
        setMessage('Notion workspace connected successfully!');

        // Try to close the window after a delay
        setTimeout(() => {
          window.close();
        }, 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 p-4 dark:from-stone-950 dark:to-stone-900">
      <div className="w-full max-w-md rounded-3xl border bg-white p-12 text-center shadow-xl dark:border-stone-800 dark:bg-stone-900">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold">Connecting...</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold">Connected!</h1>
            {workspaceName && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm">
                <svg className="h-4 w-4" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94c-2.333-3.113-3.3-5.443-3.3-8.167V11.113c0-3.497 1.553-6.413 6.017-6.8z" />
                </svg>
                {workspaceName}
              </div>
            )}
            <p className="mb-6 text-muted-foreground">
              You can now close this window and return to the app.
            </p>
            <button
              onClick={() => window.close()}
              className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Close Window
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold">Connection Failed</h1>
            <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{message}</p>
            </div>
            <p className="mb-6 text-muted-foreground">
              Please close this window and try again from the app.
            </p>
            <button
              onClick={() => window.close()}
              className="rounded-xl bg-muted px-6 py-3 font-medium text-foreground transition-opacity hover:opacity-90"
            >
              Close Window
            </button>
          </>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          If this window doesn&apos;t close automatically, you can close it manually.
        </p>
      </div>
    </div>
  );
}
