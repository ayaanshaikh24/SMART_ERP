'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useShortcuts, type ShortcutAction } from '@/components/shortcut-context';

interface PaletteEntry {
  id: string;
  label: string;
  keys: string[];
  action: () => void;
}

const kbdBase =
  'inline-flex items-center justify-center h-5 min-w-[1.375rem] px-1.5 rounded-[5px] ' +
  'text-[11px] font-mono font-bold leading-none select-none ' +
  'transition-all duration-150 ease-out';

const kbdDefault = `${kbdBase} bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-500 border border-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]`;

const kbdSelected = `${kbdBase} bg-gradient-to-b from-emerald-600/30 to-emerald-700/20 text-emerald-300 border border-emerald-500/30 shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]`;

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, triggerAction, setPendingIntent } = useShortcuts();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigateWithIntent = useCallback((path: string, action: ShortcutAction) => {
    setPendingIntent(action);
    setCommandPaletteOpen(false);
    router.push(path);
  }, [router, setCommandPaletteOpen, setPendingIntent]);

  const entries: PaletteEntry[] = [
    { id: 'dashboard', label: 'Go to Dashboard', keys: ['F1'], action: () => { router.push('/'); setCommandPaletteOpen(false); } },
    { id: 'customers', label: 'Go to Customer Ledgers', keys: ['F2'], action: () => { router.push('/customers'); setCommandPaletteOpen(false); } },
    { id: 'suppliers', label: 'Go to Supplier Ledgers', keys: ['F3'], action: () => { router.push('/suppliers'); setCommandPaletteOpen(false); } },
    { id: 'stock-items', label: 'Go to Stock Items', keys: ['F4'], action: () => { router.push('/stock-items'); setCommandPaletteOpen(false); } },
    { id: 'sales', label: 'Go to Sales Vouchers', keys: ['F8'], action: () => { router.push('/sales-vouchers'); setCommandPaletteOpen(false); } },
    { id: 'purchases', label: 'Go to Purchase Vouchers', keys: ['F9'], action: () => { router.push('/purchase-vouchers'); setCommandPaletteOpen(false); } },
    { id: 'add-customer', label: 'Add New Customer', keys: ['F6'], action: () => navigateWithIntent('/customers', 'addCustomer') },
    { id: 'add-supplier', label: 'Add New Supplier', keys: ['F7'], action: () => navigateWithIntent('/suppliers', 'addSupplier') },
    { id: 'add-stock', label: 'Add New Stock Item', keys: ['F10'], action: () => navigateWithIntent('/stock-items', 'addStockItem') },
    { id: 'refresh', label: 'Refresh Current Page', keys: ['F5'], action: () => { setCommandPaletteOpen(false); triggerAction('refresh'); } },
  ];

  const filtered = query.trim()
    ? entries.filter((e) => e.label.toLowerCase().includes(query.toLowerCase()))
    : entries;

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
          <Search className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type to search pages & actions..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-white placeholder-zinc-500 focus:ring-0"
          />
          <kbd className={kbdDefault}>Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-500">No results found</div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => entry.action()}
                  className={`flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    i === selectedIndex
                      ? 'bg-emerald-500/15 text-white shadow-[inset_0_0_0_1px_rgba(52,211,153,0.15)]'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {i === selectedIndex && (
                      <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                    )}
                    {entry.label}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    {entry.keys.map((key, ki) => (
                      <kbd key={ki} className={i === selectedIndex ? kbdSelected : kbdDefault}>
                        {key}
                      </kbd>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
