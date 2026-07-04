'use client';

import React from 'react';
import { Zap, X } from 'lucide-react';
import { useShortcuts } from '@/components/shortcut-context';

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string }[];
}

const groups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    items: [
      { keys: ['F1'], label: 'Dashboard' },
      { keys: ['F2'], label: 'Customers' },
      { keys: ['F3'], label: 'Suppliers' },
      { keys: ['F4'], label: 'Stock Items' },
      { keys: ['F8'], label: 'Sales Vouchers' },
      { keys: ['F9'], label: 'Purchase Vouchers' },
    ],
  },
  {
    title: 'Quick Create',
    items: [
      { keys: ['F6'], label: 'New Customer' },
      { keys: ['F7'], label: 'New Supplier' },
      { keys: ['F10'], label: 'New Stock Item' },
    ],
  },
  {
    title: 'Actions',
    items: [
      { keys: ['Alt', 'A'], label: 'Save Form' },
      { keys: ['Esc'], label: 'Close / Back' },
      { keys: ['Ctrl', 'K'], label: 'Command Palette' },
      { keys: ['F5'], label: 'Refresh Data' },
      { keys: ['Alt', 'D'], label: 'Download Invoice PDF' },
      { keys: ['Alt', 'P'], label: 'Print Invoice' },
    ],
  },
];

const kbdClass =
  'inline-flex items-center justify-center h-5 min-w-[1.375rem] px-1.5 rounded-[5px] ' +
  'bg-gradient-to-b from-zinc-800 to-zinc-900 ' +
  'text-[11px] font-mono font-bold text-emerald-300 ' +
  'border border-emerald-500/20 ' +
  'shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] ' +
  'leading-none select-none ' +
  'transition-all duration-150 ease-out ' +
  'hover:scale-110 hover:shadow-[0_0_14px_rgba(52,211,153,0.15)] hover:border-emerald-500/40 hover:text-emerald-200 ' +
  'active:scale-95 active:shadow-none';

function KbdBadge({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, i) => (
        <kbd key={i} className={kbdClass}>
          {key}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutsPanel() {
  const { shortcutsPanelOpen, setShortcutsPanelOpen } = useShortcuts();

  return (
    <>
      {/* Toggle pill tab (collapsed) */}
      {!shortcutsPanelOpen && (
        <button
          onClick={() => setShortcutsPanelOpen(true)}
          className="
            fixed right-0 top-1/2 -translate-y-1/2 z-40
            flex flex-col items-center gap-2
            px-2.5 py-4
            rounded-l-xl
            bg-gradient-to-r from-zinc-900/95 to-zinc-900/90
            border border-zinc-800 border-r-0
            shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_0_rgba(52,211,153,0)]
            backdrop-blur-md
            text-zinc-500
            transition-all duration-300 ease-out
            hover:translate-x-[-3px]
            hover:bg-gradient-to-r hover:from-zinc-800/95 hover:to-zinc-800/90
            hover:text-emerald-300
            hover:shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(52,211,153,0.08)]
            hover:border-emerald-500/20
            active:translate-x-[-1px] active:scale-[0.97]
            group
          "
          title="Show Shortcuts (Ctrl+/)"
        >
          {/* Emerald accent rail on the left edge */}
          <span className="absolute left-0 top-3 bottom-3 w-[2.5px] rounded-r-full bg-emerald-500/40 group-hover:bg-emerald-400/70 transition-colors duration-300" />

          {/* Pulsing dot indicator */}
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500/30 animate-pulse" />

          <Zap className="h-[18px] w-[18px] transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.35)] group-hover:text-emerald-300" />
          <span
            className="text-[10px] font-extrabold uppercase tracking-[0.18em] transition-colors duration-300"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Shortcuts
          </span>
        </button>
      )}

      {/* Expanded panel */}
      {shortcutsPanelOpen && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-zinc-900/95 backdrop-blur-md border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 shrink-0 bg-zinc-900/80">
            <div className="flex items-center gap-2.5">
              <Zap className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.2)]" />
              <span className="text-sm font-bold text-zinc-200">Shortcuts</span>
              <span className={kbdClass}>Ctrl+/</span>
            </div>
            <button
              onClick={() => setShortcutsPanelOpen(false)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Groups */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            {groups.map((group) => (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-3.5 rounded-full bg-emerald-500/60 shrink-0" />
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                    {group.title}
                  </h4>
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/40 transition-colors duration-150 group/item"
                    >
                      <span className="text-sm text-zinc-400 group-hover/item:text-zinc-200 transition-colors">
                        {item.label}
                      </span>
                      <div className="opacity-80 group-hover/item:opacity-100 transition-opacity">
                        <KbdBadge keys={item.keys} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-800 shrink-0 bg-zinc-900/80">
            <p className="text-[10px] text-zinc-600 text-center">
              Press{' '}
              <kbd className={kbdClass}>Ctrl+/</kbd>
              {' '}to toggle
            </p>
          </div>
        </div>
      )}
    </>
  );
}
