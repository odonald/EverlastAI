'use client';

import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  level: number;
  isRecording: boolean;
}

export function AudioVisualizer({ level, isRecording }: AudioVisualizerProps) {
  const bars = 12;
  const baseHeight = 4;
  const maxAdditionalHeight = 48;

  return (
    <div className="flex h-16 items-center justify-center gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => {
        // Create a wave-like pattern from center
        const center = Math.floor(bars / 2);
        const distance = Math.abs(i - center);
        const multiplier = 1 - (distance / center) * 0.5;

        // Add some randomization for more organic feel
        const randomFactor = isRecording ? 0.8 + Math.random() * 0.4 : 1;
        const height = isRecording
          ? baseHeight + level * maxAdditionalHeight * multiplier * randomFactor
          : baseHeight;

        return (
          <div
            key={i}
            className={cn(
              'w-1.5 rounded-full transition-all duration-100',
              isRecording
                ? level > 0.1
                  ? 'bg-green-500'
                  : 'bg-primary'
                : 'bg-muted'
            )}
            style={{ height: `${Math.max(baseHeight, height)}px` }}
          />
        );
      })}
    </div>
  );
}
