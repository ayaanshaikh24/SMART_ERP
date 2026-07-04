'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type ShortcutAction =
  | 'refresh'
  | 'addCustomer'
  | 'addSupplier'
  | 'addStockItem'
  | 'newSalesVoucher'
  | 'newPurchaseVoucher'
  | 'save'
  | 'close'
  | 'downloadPdf'
  | 'print'
  | 'lineItemEnter'
  | 'tableArrowUp'
  | 'tableArrowDown'
  | 'tableEnter'
  | 'esc';

interface ShortcutContextValue {
  registerHandler: (action: ShortcutAction, handler: () => void) => void;
  unregisterHandler: (action: ShortcutAction) => void;
  triggerAction: (action: ShortcutAction) => void;
  shortcutsPanelOpen: boolean;
  setShortcutsPanelOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

const ShortcutContext = createContext<ShortcutContextValue | undefined>(undefined);

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const handlersRef = useRef<Map<ShortcutAction, () => void>>(new Map());
  const [shortcutsPanelOpen, setShortcutsPanelOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const registerHandler = useCallback((action: ShortcutAction, handler: () => void) => {
    handlersRef.current.set(action, handler);
  }, []);

  const unregisterHandler = useCallback((action: ShortcutAction) => {
    handlersRef.current.delete(action);
  }, []);

  const triggerAction = useCallback((action: ShortcutAction) => {
    const handler = handlersRef.current.get(action);
    if (handler) handler();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      const isInInput = isInput && !['Escape', 'Enter'].includes(e.key) && !(e.altKey && e.key.toLowerCase() === 'a');

      if (isInInput && e.key !== 'Escape' && !(e.altKey && (e.key === 'a' || e.key === 'A'))) {
        return;
      }

      if (isInput && e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const lineItemHandler = handlersRef.current.get('lineItemEnter');
        if (lineItemHandler) {
          lineItemHandler();
          return;
        }
      }

      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (e.key) {
          case 'F1':
            e.preventDefault();
            router.push('/');
            return;
          case 'F2':
            e.preventDefault();
            router.push('/customers');
            return;
          case 'F3':
            e.preventDefault();
            router.push('/suppliers');
            return;
          case 'F4':
            e.preventDefault();
            router.push('/stock-items');
            return;
          case 'F5': {
            e.preventDefault();
            const refreshHandler = handlersRef.current.get('refresh');
            if (refreshHandler) refreshHandler();
            return;
          }
          case 'F6': {
            e.preventDefault();
            const addCustomerHandler = handlersRef.current.get('addCustomer');
            if (addCustomerHandler) addCustomerHandler();
            return;
          }
          case 'F7': {
            e.preventDefault();
            const addSupplierHandler = handlersRef.current.get('addSupplier');
            if (addSupplierHandler) addSupplierHandler();
            return;
          }
          case 'F8': {
            e.preventDefault();
            const inSales = pathname.includes('/sales-vouchers');
            if (inSales) {
              const newSalesHandler = handlersRef.current.get('newSalesVoucher');
              if (newSalesHandler) newSalesHandler();
            } else {
              router.push('/sales-vouchers');
            }
            return;
          }
          case 'F9': {
            e.preventDefault();
            const inPurchase = pathname.includes('/purchase-vouchers');
            if (inPurchase) {
              const newPurchaseHandler = handlersRef.current.get('newPurchaseVoucher');
              if (newPurchaseHandler) newPurchaseHandler();
            } else {
              router.push('/purchase-vouchers');
            }
            return;
          }
          case 'F10': {
            e.preventDefault();
            const addStockHandler = handlersRef.current.get('addStockItem');
            if (addStockHandler) addStockHandler();
            return;
          }
          case 'Escape': {
            const escHandler = handlersRef.current.get('esc');
            if (escHandler) {
              e.preventDefault();
              escHandler();
            }
            return;
          }
          case 'ArrowUp': {
            if (!isInput) {
              e.preventDefault();
              const handler = handlersRef.current.get('tableArrowUp');
              if (handler) handler();
            }
            return;
          }
          case 'ArrowDown': {
            if (!isInput) {
              e.preventDefault();
              const handler = handlersRef.current.get('tableArrowDown');
              if (handler) handler();
            }
            return;
          }
          case 'Enter': {
            if (!isInput) {
              e.preventDefault();
              const handler = handlersRef.current.get('tableEnter');
              if (handler) handler();
            }
            return;
          }
        }
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'k' && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (e.ctrlKey && e.key === '/' && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsPanelOpen((prev) => !prev);
        return;
      }

      if (e.altKey && (e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const saveHandler = handlersRef.current.get('save');
        if (saveHandler) saveHandler();
        return;
      }

      if (e.altKey && (e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const downloadHandler = handlersRef.current.get('downloadPdf');
        if (downloadHandler) downloadHandler();
        return;
      }

      if (e.altKey && (e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const printHandler = handlersRef.current.get('print');
        if (printHandler) printHandler();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname]);

  return (
    <ShortcutContext.Provider
      value={{
        registerHandler,
        unregisterHandler,
        triggerAction,
        shortcutsPanelOpen,
        setShortcutsPanelOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
      }}
    >
      {children}
    </ShortcutContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutProvider');
  }
  return context;
}

export function useShortcutHandler(action: ShortcutAction, handler: (() => void) | null) {
  const { registerHandler, unregisterHandler } = useShortcuts();
  const handlerRef = useRef<(() => void) | null>(null);
  handlerRef.current = handler;

  useEffect(() => {
    if (handler) {
      const wrapped = () => handlerRef.current?.();
      registerHandler(action, wrapped);
      return () => unregisterHandler(action);
    } else {
      unregisterHandler(action);
      return;
    }
  }, [action, !!handler, registerHandler, unregisterHandler]);
}
