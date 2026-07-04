'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { useShortcutHandler } from '@/components/shortcut-context';
import { ShortcutHint } from '@/components/shortcut-hint';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  outstanding_balance: number;
}

interface StockItem {
  id: string;
  name: string;
  sku: string;
  purchase_price: number;
  gst_percent: number;
  quantity: number;
  unit: string;
}

interface SelectedItem {
  stock_item_id: string;
  quantity: number;
  rate: number;
  gst_percent: number;
  available_stock: number;
  unit: string;
}

export default function NewPurchaseVoucherPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [items, setItems] = useState<SelectedItem[]>([
    { stock_item_id: '', quantity: 1, rate: 0, gst_percent: 0, available_stock: 0, unit: 'PCS' }
  ]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lastQuantityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppRes, itemsRes] = await Promise.all([
          apiFetch('/api/suppliers'),
          apiFetch('/api/stock-items')
        ]);

        if (suppRes.ok && itemsRes.ok) {
          setSuppliers(await suppRes.json());
          setStockItems(await itemsRes.json());
        }
      } catch (err) {
        console.error('Error fetching masters:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddRow = () => {
    setItems([
      ...items,
      { stock_item_id: '', quantity: 1, rate: 0, gst_percent: 0, available_stock: 0, unit: 'PCS' }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, stockItemId: string) => {
    const selectedStockItem = stockItems.find(i => i.id === stockItemId);
    const newItems = [...items];
    
    if (selectedStockItem) {
      newItems[index] = {
        stock_item_id: stockItemId,
        quantity: newItems[index].quantity,
        rate: selectedStockItem.purchase_price,
        gst_percent: selectedStockItem.gst_percent,
        available_stock: selectedStockItem.quantity,
        unit: selectedStockItem.unit
      };
    } else {
      newItems[index] = {
        stock_item_id: '',
        quantity: 1,
        rate: 0,
        gst_percent: 0,
        available_stock: 0,
        unit: 'PCS'
      };
    }
    setItems(newItems);
  };

  const handleFieldChange = (index: number, field: keyof SelectedItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setItems(newItems);
  };

  // Math helper calculations
  const calculateTotals = () => {
    let taxableSubtotal = 0;
    let totalGst = 0;

    items.forEach(item => {
      if (item.stock_item_id) {
        const lineTotal = item.quantity * item.rate;
        const lineGst = lineTotal * (item.gst_percent / 100);
        taxableSubtotal += lineTotal;
        totalGst += lineGst;
      }
    });

    const grandTotal = taxableSubtotal + totalGst;

    return {
      taxableSubtotal: Number(taxableSubtotal.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!selectedSupplierId) {
      setError('Please select a supplier ledger.');
      return;
    }

    const filteredItems = items.filter(item => item.stock_item_id !== '');
    if (filteredItems.length === 0) {
      setError('Please add at least one stock item to the voucher.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        supplier_id: selectedSupplierId,
        items: filteredItems.map(item => ({
          stock_item_id: item.stock_item_id,
          quantity: Number(item.quantity),
          rate: Number(item.rate)
        }))
      };

      const res = await apiFetch('/api/purchase-vouchers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create purchase voucher.');
      }

      router.push('/purchase-vouchers');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isDirty = selectedSupplierId !== '' || items.some(i => i.stock_item_id !== '');

  const handleEsc = useCallback(() => {
    if (isDirty) {
      if (window.confirm('Discard changes and go back?')) {
        router.back();
      }
    } else {
      router.back();
    }
  }, [isDirty, router]);

  useShortcutHandler('save', () => {
    formRef.current?.requestSubmit();
  });
  useShortcutHandler('esc', handleEsc);
  useShortcutHandler('lineItemEnter', () => {
    const active = document.activeElement;
    if (active && lastQuantityRef.current === active) {
      handleAddRow();
      setTimeout(() => {
        const selects = document.querySelectorAll('select');
        const lastSelect = selects[selects.length - 1];
        if (lastSelect) lastSelect.focus();
      }, 50);
    }
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleEsc()}
            className="p-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors relative group"
            title="Close (Esc)"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-500 whitespace-nowrap">Esc</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">New Purchase Voucher</h1>
            <p className="text-sm text-zinc-400">Record inward stock from suppliers and automatically increase item inventory levels</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Voucher Header</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Select Supplier Ledger *
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Bal: ₹{Number(s.outstanding_balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Voucher Date
                </label>
                <input
                  type="text"
                  disabled
                  value={new Date().toLocaleDateString()}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-2.5 text-zinc-400 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Purchase Line Items</h3>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-semibold bg-zinc-950/20">
                    <th className="pb-3 w-[45%]">Select Stock Item</th>
                    <th className="pb-3 text-right w-[15%]">Cost Rate (₹)</th>
                    <th className="pb-3 text-right w-[15%]">Quantity</th>
                    <th className="pb-3 text-right w-[10%]">GST %</th>
                    <th className="pb-3 text-right w-[15%]">Amount</th>
                    <th className="pb-3 text-center w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {items.map((item, index) => (
                    <tr key={index} className="align-middle">
                      <td className="py-3 pr-4">
                        <select
                          required
                          value={item.stock_item_id}
                          onChange={(e) => handleItemChange(index, e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                        >
                          <option value="">-- Choose Stock Item --</option>
                          {stockItems.map((si) => (
                            <option key={si.id} value={si.id}>
                              {si.name} (SKU: {si.sku})
                            </option>
                          ))}
                        </select>
                        {item.stock_item_id && (
                          <div className="text-xs text-zinc-500 mt-1 pl-1">
                            Current Stock: <span className="font-semibold text-zinc-300">{item.available_stock} {item.unit}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.rate || ''}
                          onChange={(e) => handleFieldChange(index, 'rate', Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-right text-zinc-100 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-0.5">
                          <input
                            ref={index === items.length - 1 ? lastQuantityRef : undefined}
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={item.quantity || ''}
                            onChange={(e) => handleFieldChange(index, 'quantity', Number(e.target.value))}
                            placeholder="0"
                            className="w-full bg-transparent border-0 outline-none text-right text-zinc-100 text-sm focus:ring-0 py-1.5"
                          />
                          <span className="text-xs font-semibold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded leading-none">
                            {item.unit}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right text-zinc-400 font-medium">
                        {item.gst_percent}%
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-zinc-200">
                        ₹{Number(item.quantity * item.rate).toFixed(2)}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          disabled={items.length === 1}
                          onClick={() => handleRemoveRow(index)}
                          className="p-1.5 rounded bg-zinc-950 text-zinc-650 hover:text-red-400 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations & Submit */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="text-zinc-500 text-xs max-w-sm">
              Note: Saving this purchase entry will dynamically increase item quantities in your stock registry and add the invoice total to the supplier outstanding ledger.
            </div>

            <div className="w-full md:w-80 bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl space-y-4">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal (Excl. GST):</span>
                <span>₹{totals.taxableSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-400">
                <span>GST Total:</span>
                <span>₹{totals.totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-white border-t border-zinc-800 pt-3">
                <span>Grand Total:</span>
                <span className="text-emerald-400">₹{totals.grandTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3 rounded-lg text-sm font-bold shadow-lg transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {submitting ? 'Saving Voucher...' : 'Save Purchase Entry'}
                <ShortcutHint keys={['Alt', 'A']} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
