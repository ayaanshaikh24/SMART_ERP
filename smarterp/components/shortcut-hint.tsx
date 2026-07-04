'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ShortcutHintProps {
  keys: string[];
  className?: string;
}

const keyClass =
  'inline-flex items-center justify-center h-5 min-w-[1.375rem] px-1.5 rounded-[5px] ' +
  'bg-gradient-to-b from-zinc-800 to-zinc-900 ' +
  'text-[11px] font-mono font-bold text-emerald-300 ' +
  'border border-emerald-500/20 ' +
  'shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] ' +
  'leading-none select-none ' +
  'transition-all duration-150 ease-out ' +
  'hover:scale-110 hover:shadow-[0_0_14px_rgba(52,211,153,0.15)] hover:border-emerald-500/40 hover:text-emerald-200 ' +
  'active:scale-95 active:shadow-none';

export function ShortcutHint({ keys, className }: ShortcutHintProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 ml-1.5', className)}>
      {keys.map((key, i) => (
        <kbd key={i} className={keyClass}>
          {key}
        </kbd>
      ))}
    </span>
  );
}
