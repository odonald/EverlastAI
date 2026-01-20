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
      <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center sm:p-8 md:p-12">
        <FileText className="mb-3 h-8 w-8 text-muted-foreground/50 sm:mb-4 sm:h-12 sm:w-12" />
        <h3 className="mb-1 text-base font-medium text-muted-foreground sm:mb-2 sm:text-lg">No output yet</h3>
        <p className="text-xs text-muted-foreground/75 sm:text-sm">
          Start recording to generate enriched text output
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="relative rounded-xl border bg-card p-4 sm:p-6">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h3 className="text-xs font-medium text-muted-foreground sm:text-sm">Enriched Output</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!content || isLoading}
            className="h-7 text-xs sm:h-8 sm:text-sm"
          >
            {copied ? (
              <>
                <Check className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Content */}
        <div
          className={cn(
            'min-h-[120px] whitespace-pre-wrap text-sm text-foreground sm:min-h-[200px] sm:text-base',
            isLoading && 'animate-pulse text-muted-foreground'
          )}
        >
          {isLoading ? (
            <div className="space-y-2 sm:space-y-3">
              <div className="h-3 w-3/4 rounded bg-muted sm:h-4" />
              <div className="h-3 w-full rounded bg-muted sm:h-4" />
              <div className="h-3 w-5/6 rounded bg-muted sm:h-4" />
              <div className="h-3 w-2/3 rounded bg-muted sm:h-4" />
            </div>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}
