'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { useShortcuts } from '@/components/shortcut-context';
import { cn } from '@/lib/utils';

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

function KbdBadge({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-[4px] bg-zinc-800 text-[11px] font-mono font-semibold text-zinc-300 border border-zinc-700 leading-none"
        >
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
      {/* Toggle strip (collapsed) */}
      {!shortcutsPanelOpen && (
        <button
          onClick={() => setShortcutsPanelOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 bg-zinc-900 border border-zinc-800 border-r-0 rounded-l-lg px-1.5 py-3 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all shadow-lg"
          title="Show Shortcuts (Ctrl+/)"
        >
          <Keyboard className="h-4 w-4" />
          <span className="writing-mode-vertical text-[10px] font-semibold uppercase tracking-wider" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
            Shortcuts
          </span>
        </button>
      )}

      {/* Expanded panel */}
      {shortcutsPanelOpen && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2 text-zinc-300">
              <Keyboard className="h-4 w-4" />
              <span className="text-sm font-bold">Shortcuts</span>
              <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-zinc-800 text-[10px] font-mono text-zinc-500 border border-zinc-700 ml-1">
                Ctrl+/
              </kbd>
            </div>
            <button
              onClick={() => setShortcutsPanelOpen(false)}
              className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            {groups.map((group) => (
              <div key={group.title}>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                  {group.title}
                </h4>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                      <span className="text-sm text-zinc-300">{item.label}</span>
                      <KbdBadge keys={item.keys} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
            <p className="text-[10px] text-zinc-600 text-center">
              Press <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-zinc-800 text-[10px] font-mono text-zinc-500 border border-zinc-700">Ctrl+/</kbd> to toggle
            </p>
          </div>
        </div>
      )}
    </>
  );
}
