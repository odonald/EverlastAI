'use client';

import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  level: number;
  isRecording: boolean;
}

export function AudioVisualizer({ level, isRecording }: AudioVisualizerProps) {
  const bars = 5;
  const baseHeight = 8;
  const maxAdditionalHeight = 32;

  return (
    <div className="flex h-12 items-center justify-center gap-1">
      {Array.from({ length: bars }).map((_, i) => {
        const distance = Math.abs(i - Math.floor(bars / 2));
        const multiplier = 1 - distance * 0.2;
        const height = isRecording
          ? baseHeight + level * maxAdditionalHeight * multiplier
          : baseHeight;

        return (
          <div
            key={i}
            className={cn(
              'w-2 rounded-full transition-all duration-75',
              isRecording ? 'bg-primary' : 'bg-muted'
            )}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
