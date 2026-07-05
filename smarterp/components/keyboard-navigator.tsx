'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Keyboard, 
  Home, 
  Users, 
  Truck, 
  Package, 
  Receipt, 
  ShoppingBag, 
  X, 
  Search,
  Plus,
  RefreshCw,
  Printer,
  Download,
  FileText
} from 'lucide-react';

interface ActionItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  shortcut: string;
  run: () => void;
}

export default function KeyboardNavigator() {
  const router = useRouter();
  const pathname = usePathname();

  // Reference Panel state
  const [panelOpen, setPanelOpen] = useState(false);

  // Command Palette states
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Command Palette Options
  const actions: ActionItem[] = [
    { 
      name: 'Go to Dashboard', 
      description: 'Navigate to real-time business overview dashboard',
      icon: <Home className="h-4 w-4" />, 
      shortcut: 'F1', 
      run: () => router.push('/') 
    },
    { 
      name: 'Go to Customer Ledgers', 
      description: 'View and manage customer ledger balances',
      icon: <Users className="h-4 w-4" />, 
      shortcut: 'F2', 
      run: () => router.push('/customers') 
    },
    { 
      name: 'Go to Supplier Ledgers', 
      description: 'View and track supplier outstanding payables',
      icon: <Truck className="h-4 w-4" />, 
      shortcut: 'F3', 
      run: () => router.push('/suppliers') 
    },
    { 
      name: 'Go to Stock Items', 
      description: 'Check inventory catalog and stock levels',
      icon: <Package className="h-4 w-4" />, 
      shortcut: 'F4', 
      run: () => router.push('/stock-items') 
    },
    { 
      name: 'Go to Sales Vouchers', 
      description: 'View customer billing and sales invoices',
      icon: <Receipt className="h-4 w-4" />, 
      shortcut: 'F8', 
      run: () => router.push('/sales-vouchers') 
    },
    { 
      name: 'Go to Purchase Vouchers', 
      description: 'View inward supplier stock vouchers',
      icon: <ShoppingBag className="h-4 w-4" />, 
      shortcut: 'F9', 
      run: () => router.push('/purchase-vouchers') 
    },
    { 
      name: 'Create Customer Ledger', 
      description: 'Create a new business customer ledger account',
      icon: <Plus className="h-4 w-4 text-emerald-400" />, 
      shortcut: 'F6', 
      run: () => {
        if (pathname === '/customers') {
          window.dispatchEvent(new CustomEvent('smarterp-add-customer'));
        } else {
          router.push('/customers?new=true');
        }
      }
    },
    { 
      name: 'Create Supplier Ledger', 
      description: 'Create a new product supplier ledger account',
      icon: <Plus className="h-4 w-4 text-emerald-400" />, 
      shortcut: 'F7', 
      run: () => {
        if (pathname === '/suppliers') {
          window.dispatchEvent(new CustomEvent('smarterp-add-supplier'));
        } else {
          router.push('/suppliers?new=true');
        }
      }
    },
    { 
      name: 'Create Stock Item', 
      description: 'Add a new inventory item to product list',
      icon: <Plus className="h-4 w-4 text-emerald-400" />, 
      shortcut: 'F10', 
      run: () => {
        if (pathname === '/stock-items') {
          window.dispatchEvent(new CustomEvent('smarterp-add-stock-item'));
        } else {
          router.push('/stock-items?new=true');
        }
      }
    },
    { 
      name: 'Create Sales Voucher', 
      description: 'Generate a new customer billing invoice',
      icon: <Receipt className="h-4 w-4 text-emerald-400" />, 
      shortcut: 'F8 (on sales page)', 
      run: () => router.push('/sales-vouchers/new') 
    },
    { 
      name: 'Create Purchase Voucher', 
      description: 'Log new inward stock from supplier',
      icon: <ShoppingBag className="h-4 w-4 text-emerald-400" />, 
      shortcut: 'F9 (on purchase page)', 
      run: () => router.push('/purchase-vouchers/new') 
    },
    {
      name: 'Refresh Page Data',
      description: 'Re-fetch latest records from Supabase database',
      icon: <RefreshCw className="h-4 w-4" />,
      shortcut: 'F5',
      run: () => window.dispatchEvent(new CustomEvent('smarterp-refresh'))
    }
  ];

  // Filter actions based on query
  const filteredActions = actions.filter(action =>
    action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Automatically focus query search input when command palette opens
  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setSearchQuery('');
      setFocusedIndex(0);
    }
  }, [paletteOpen]);

  // Global keyboard shortcuts handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Identify active input focus
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );

      // Alt+A (Save form) works everywhere, even inside active inputs
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('smarterp-save'));
        return;
      }

      // Escape key behavior (closes dialog overlays or goes back)
      if (e.key === 'Escape') {
        if (paletteOpen) {
          e.preventDefault();
          setPaletteOpen(false);
          return;
        }
        if (panelOpen) {
          e.preventDefault();
          setPanelOpen(false);
          return;
        }
        
        // Dispatch custom escape event to check if page modals close first
        const escEvent = new CustomEvent('smarterp-escape');
        window.dispatchEvent(escEvent);
        
        // If not handled by page modal, trigger browser back for voucher creation forms
        setTimeout(() => {
          if (!(escEvent as any).handled) {
            if (pathname.includes('/new') || pathname.endsWith('/new')) {
              router.back();
            }
          }
        }, 50);
        return;
      }

      // If Command Palette is open, intercept Arrow keys and Enter
      if (paletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % filteredActions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredActions[focusedIndex]) {
            filteredActions[focusedIndex].run();
            setPaletteOpen(false);
          }
          return;
        }
      }

      // If user is actively typing in input, ignore navigation shortcuts
      if (isInputActive) {
        return;
      }

      // Command Palette Toggle (Ctrl+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
        return;
      }

      // Shortcuts Reference Panel Toggle (Ctrl+/)
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setPanelOpen(prev => !prev);
        return;
      }

      // Function keys F1-F10
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          router.push('/');
          break;
        case 'F2':
          e.preventDefault();
          router.push('/customers');
          break;
        case 'F3':
          e.preventDefault();
          router.push('/suppliers');
          break;
        case 'F4':
          e.preventDefault();
          router.push('/stock-items');
          break;
        case 'F5':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('smarterp-refresh'));
          break;
        case 'F6':
          e.preventDefault();
          if (pathname === '/customers') {
            window.dispatchEvent(new CustomEvent('smarterp-add-customer'));
          } else {
            router.push('/customers?new=true');
          }
          break;
        case 'F7':
          e.preventDefault();
          if (pathname === '/suppliers') {
            window.dispatchEvent(new CustomEvent('smarterp-add-supplier'));
          } else {
            router.push('/suppliers?new=true');
          }
          break;
        case 'F8':
          e.preventDefault();
          if (pathname === '/sales-vouchers') {
            router.push('/sales-vouchers/new');
          } else {
            router.push('/sales-vouchers');
          }
          break;
        case 'F9':
          e.preventDefault();
          if (pathname === '/purchase-vouchers') {
            router.push('/purchase-vouchers/new');
          } else {
            router.push('/purchase-vouchers');
          }
          break;
        case 'F10':
          e.preventDefault();
          if (pathname === '/stock-items') {
            window.dispatchEvent(new CustomEvent('smarterp-add-stock-item'));
          } else {
            router.push('/stock-items?new=true');
          }
          break;
        default:
          break;
      }

      // Alt+D (Download PDF)
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('smarterp-download-pdf'));
      }

      // Alt+P (Print PDF)
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('smarterp-print-pdf'));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [paletteOpen, panelOpen, pathname, router, filteredActions, focusedIndex]);

  return (
    <>
      {/* 1. CMD+K COMMAND PALETTE OVERLAY */}
      {paletteOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-xs pt-[15vh] p-4"
          onClick={() => setPaletteOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-3 bg-zinc-950 border-b border-zinc-800">
              <Search className="h-5 w-5 text-zinc-500 mr-3" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Type a screen name or action (e.g. Customers)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                className="bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-500 text-sm w-full focus:ring-0"
              />
              <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-semibold font-mono">ESC</span>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2 space-y-0.5">
              {filteredActions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No matching screens or actions found.
                </div>
              ) : (
                filteredActions.map((action, index) => {
                  const isFocused = index === focusedIndex;
                  return (
                    <button
                      key={action.name}
                      onClick={() => {
                        action.run();
                        setPaletteOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-left transition-all ${
                        isFocused 
                          ? 'bg-emerald-500 text-zinc-950 shadow-md font-semibold' 
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isFocused ? 'text-zinc-950' : 'text-zinc-400'}>
                          {action.icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{action.name}</p>
                          <p className={`text-xs ${isFocused ? 'text-zinc-900/80' : 'text-zinc-500'}`}>
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <kbd className={`px-1.5 py-0.5 border text-[10px] rounded font-mono font-bold leading-none ${
                        isFocused 
                          ? 'bg-zinc-950 border-zinc-800 text-emerald-400' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}>
                        {action.shortcut}
                      </kbd>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-850 bg-zinc-900/50 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
              <span>Navigate: <span className="font-mono text-zinc-400 font-bold">↑ ↓</span></span>
              <span>Execute: <span className="font-mono text-zinc-400 font-bold">ENTER</span></span>
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSISTENT SHORTCUTS REF PANEL (Right Drawer) */}
      <div className={`flex flex-col h-full border-l border-zinc-800 transition-all duration-200 select-none ${
        panelOpen ? 'w-72 bg-zinc-900' : 'w-12 bg-zinc-900/30 hover:bg-zinc-900/50 cursor-pointer'
      }`}
        onClick={() => !panelOpen && setPanelOpen(true)}
      >
        {panelOpen ? (
          // Expanded view
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
              <span className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                <Keyboard className="h-4 w-4" />
                Keyboard Shortcuts
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelOpen(false);
                }} 
                className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
              {/* Group: Navigation */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Primary Navigation</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F1 Dashboard</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F1</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F2 Customer Ledgers</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F2</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F3 Supplier Ledgers</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F3</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F4 Stock Items Catalog</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F4</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F8 Sales Registry / New</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F8</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F9 Purchase Registry / New</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F9</kbd>
                  </div>
                </div>
              </div>

              {/* Group: Quick Create */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Quick Create Masters</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F6 Add Customer</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F6</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F7 Add Supplier</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F7</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>F10 Add Stock Item</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F10</kbd>
                  </div>
                </div>
              </div>

              {/* Group: General Actions */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">General Actions</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Save / Submit Form</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">Alt+A</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Close Modal / Go Back</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Search Command Palette</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">Ctrl+K</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Refresh DB Data</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">F5</kbd>
                  </div>
                </div>
              </div>

              {/* Group: Invoice Print/Export */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Invoice Actions</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Download PDF Invoice</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">Alt+D</kbd>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span>Print Invoice PDF</span>
                    <kbd className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded font-mono font-bold text-zinc-400 text-[10px]">Alt+P</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
              SmartERP Keyboard Layer v1.0
            </div>
          </div>
        ) : (
          // Collapsed strip view
          <div className="flex flex-col items-center justify-between h-full py-6">
            <Keyboard className="h-5 w-5 text-zinc-500 hover:text-emerald-400 transition-colors" />
            <div 
              className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest origin-center rotate-90 my-auto whitespace-nowrap"
              style={{ transform: 'rotate(90deg) translate(0px, 0px)' }}
            >
              Shortcuts Panel
            </div>
            <span className="text-[8px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1 py-0.5 rounded font-semibold font-mono text-center">
              Ctrl+/
            </span>
          </div>
        )}
      </div>
    </>
  );
}
