'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ShortcutHintProps {
  keys: string[];
  className?: string;
}

export function ShortcutHint({ keys, className }: ShortcutHintProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 ml-1.5', className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center h-4 min-w-[1.125rem] px-1 rounded-[3px] bg-zinc-800 text-[10px] font-mono font-semibold text-zinc-400 border border-zinc-700 leading-none shadow-sm"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
