'use client';

import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HotkeyIndicator() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const hotkey = isMac ? '⌘+Shift+R' : 'Ctrl+Shift+R';

  return (
    <div className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-1 lg:gap-2 lg:px-3 lg:py-1.5">
      <Keyboard className="h-3.5 w-3.5 text-muted-foreground lg:h-4 lg:w-4" />
      <kbd
        className={cn(
          'rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium lg:px-2 lg:text-xs',
          'text-foreground shadow-sm'
        )}
      >
        {hotkey}
      </kbd>
    </div>
  );
}
