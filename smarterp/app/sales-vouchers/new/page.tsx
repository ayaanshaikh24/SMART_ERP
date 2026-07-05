'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { useShortcutHandler } from '@/components/shortcut-context';
import { ShortcutHint } from '@/components/shortcut-hint';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  outstanding_balance: number;
}

interface StockItem {
  id: string;
  name: string;
  sku: string;
  selling_price: number;
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

export default function NewSalesVoucherPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
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
        const [custRes, itemsRes] = await Promise.all([
          apiFetch('/api/customers'),
          apiFetch('/api/stock-items')
        ]);

        if (custRes.ok && itemsRes.ok) {
          setCustomers(await custRes.json());
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
        rate: selectedStockItem.selling_price,
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
    if (!selectedCustomerId) {
      setError('Please select a customer ledger.');
      return;
    }

    const filteredItems = items.filter(item => item.stock_item_id !== '');
    if (filteredItems.length === 0) {
      setError('Please add at least one stock item to the voucher.');
      return;
    }

    // Check stock quantities client-side before sending
    for (const item of filteredItems) {
      const stockItem = stockItems.find(si => si.id === item.stock_item_id);
      if (stockItem) {
        if (['PCS', 'BOX'].includes(stockItem.unit) && !Number.isInteger(Number(item.quantity))) {
          setError(`Quantity for item "${stockItem.name}" (${stockItem.unit}) must be a whole number.`);
          return;
        }
        if (stockItem.quantity < item.quantity) {
          setError(`Insufficient inventory for "${stockItem.name}". Available: ${stockItem.quantity} ${stockItem.unit}, Requested: ${item.quantity}`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        customer_id: selectedCustomerId,
        items: filteredItems.map(item => ({
          stock_item_id: item.stock_item_id,
          quantity: Number(item.quantity),
          rate: Number(item.rate)
        }))
      };

      const res = await apiFetch('/api/sales-vouchers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create sales voucher.');
      }

      router.push('/sales-vouchers');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isDirty = selectedCustomerId !== '' || items.some(i => i.stock_item_id !== '');

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
      // Focus the new row's stock item select after a short delay
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
            className="p-2 border border-border text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors relative group"
            title="Close (Esc)"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground whitespace-nowrap">Esc</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">New Sales Voucher</h1>
            <p className="text-sm text-muted-foreground">Generate a customer invoice bill and dynamically decrement stock levels</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-card/50 border border-border p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Voucher Header</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Customer Ledger *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-foreground text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Bal: ₹{Number(c.outstanding_balance).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Voucher Date
                </label>
                <input
                  type="text"
                  disabled
                  value={new Date().toLocaleDateString()}
                  className="w-full rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-muted-foreground text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-card/50 border border-border p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Invoice Line Items</h3>
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
                  <tr className="border-b border-border text-muted-foreground font-semibold bg-muted/20">
                    <th className="pb-3 w-[45%]">Select Stock Item</th>
                    <th className="pb-3 text-right w-[15%]">Rate (₹)</th>
                    <th className="pb-3 text-right w-[15%]">Quantity</th>
                    <th className="pb-3 text-right w-[10%]">GST %</th>
                    <th className="pb-3 text-right w-[15%]">Amount</th>
                    <th className="pb-3 text-center w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, index) => (
                    <tr key={index} className="align-middle">
                      <td className="py-3 pr-4">
                        <select
                          required
                          value={item.stock_item_id}
                          onChange={(e) => handleItemChange(index, e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                        >
                          <option value="">-- Choose Stock Item --</option>
                          {stockItems.map((si) => (
                            <option key={si.id} value={si.id}>
                              {si.name} (SKU: {si.sku})
                            </option>
                          ))}
                        </select>
                        {item.stock_item_id && (
                          <div className="text-xs text-muted-foreground mt-1 pl-1">
                            Available Stock: <span className={`font-bold ${item.available_stock < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>{item.available_stock} {item.unit}</span>
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
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-right text-foreground text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-0.5">
                          <input
                            ref={index === items.length - 1 ? lastQuantityRef : undefined}
                            type="number"
                            step={['PCS', 'BOX'].includes(item.unit) ? '1' : '0.01'}
                            min={['PCS', 'BOX'].includes(item.unit) ? '1' : '0.01'}
                            required
                            value={item.quantity || ''}
                            onChange={(e) => handleFieldChange(index, 'quantity', Number(e.target.value))}
                            placeholder="0"
                            className="w-full bg-transparent border-0 outline-none text-right text-foreground text-sm focus:ring-0 py-1.5"
                          />
                          <span className="text-xs font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded leading-none">
                            {item.unit}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right text-muted-foreground font-medium">
                        {item.gst_percent}%
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-foreground">
                        ₹{Number(item.quantity * item.rate).toFixed(2)}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          disabled={items.length === 1}
                          onClick={() => handleRemoveRow(index)}
                          className="p-1.5 rounded bg-background text-muted-foreground hover:text-red-400 border border-border hover:bg-accent hover:border-border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
            <div className="text-muted-foreground text-xs max-w-sm">
              Note: Submitting this sales voucher will automatically subtract the item quantities from stock and increase the customer ledger outstanding balance.
            </div>

            <div className="w-full md:w-80 bg-card/50 border border-border p-5 rounded-xl space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal (Excl. GST):</span>
                <span>₹{totals.taxableSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>GST Total:</span>
                <span>₹{totals.totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-foreground border-t border-border pt-3">
                <span>Grand Total:</span>
                <span className="text-emerald-400">₹{totals.grandTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-lg text-sm font-bold shadow-lg transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {submitting ? 'Generating Invoice...' : 'Save & Print Invoice'}
                <ShortcutHint keys={['Alt', 'A']} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
