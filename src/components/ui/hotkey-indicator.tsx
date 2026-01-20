'use client';

import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HotkeyIndicator() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const hotkey = isMac ? '⌘ + Shift + Space' : 'Ctrl + Shift + Space';

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
      <Keyboard className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Press</span>
      <kbd
        className={cn(
          'rounded border bg-background px-2 py-0.5 text-xs font-mono font-medium',
          'text-foreground shadow-sm'
        )}
      >
        {hotkey}
      </kbd>
      <span className="text-sm text-muted-foreground">to activate</span>
    </div>
  );
}
