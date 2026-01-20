'use client';

import { useState } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OutputDisplayProps {
  content: string;
  isLoading: boolean;
}

export function OutputDisplay({ content, isLoading }: OutputDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content && !isLoading) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-2 text-lg font-medium text-muted-foreground">No output yet</h3>
        <p className="text-sm text-muted-foreground/75">
          Start recording to generate enriched text output
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="relative rounded-xl border bg-card p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Enriched Output</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!content || isLoading}
            className="h-8"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Content */}
        <div
          className={cn(
            'min-h-[200px] whitespace-pre-wrap text-foreground',
            isLoading && 'animate-pulse text-muted-foreground'
          )}
        >
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}
