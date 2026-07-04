'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { useShortcutHandler } from '@/components/shortcut-context';
import { ShortcutHint } from '@/components/shortcut-hint';
import { Plus, Eye, Calendar, User, X } from 'lucide-react';

interface Voucher {
  id: string;
  supplier_id: string;
  total_amount: number;
  gst_amount: number;
  grand_total: number;
  created_at: string;
  suppliers: {
    name: string;
    mobile: string | null;
  };
}

interface Supplier {
  id: string;
  name: string;
}

export default function PurchaseVouchersPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active view modal
  const [viewVoucher, setViewVoucher] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Table keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      let query = '';
      const params = [];
      if (selectedSupplierId) params.push(`supplierId=${selectedSupplierId}`);
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) {
        query = '?' + params.join('&');
      }

      const res = await apiFetch(`/api/purchase-vouchers${query}`);
      if (res.ok) {
        const data = await res.json();
        setVouchers(data);
      }
    } catch (err) {
      console.error('Error fetching purchase vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await apiFetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchVouchers();
  }, [selectedSupplierId, startDate, endDate]);

  const handleViewDetails = async (id: string) => {
    setViewLoading(true);
    setViewVoucher(null);
    try {
      const res = await apiFetch(`/api/purchase-vouchers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewVoucher(data);
      }
    } catch (err) {
      console.error('Error fetching voucher details:', err);
    } finally {
      setViewLoading(false);
    }
  };

  useShortcutHandler('refresh', fetchVouchers);
  useShortcutHandler('newPurchaseVoucher', () => router.push('/purchase-vouchers/new'));
  useShortcutHandler('esc', viewVoucher ? () => setViewVoucher(null) : null);

  // Table keyboard navigation
  useShortcutHandler('tableArrowDown', !viewVoucher && vouchers.length > 0 ? () => {
    setFocusedIndex((prev) => {
      const next = Math.min(prev + 1, vouchers.length - 1);
      rowRefs.current[next]?.focus();
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  } : null);
  useShortcutHandler('tableArrowUp', !viewVoucher && vouchers.length > 0 ? () => {
    setFocusedIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      rowRefs.current[next]?.focus();
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  } : null);
  useShortcutHandler('tableEnter', !viewVoucher && focusedIndex >= 0 ? () => {
    handleViewDetails(vouchers[focusedIndex].id);
  } : null);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Purchase Vouchers</h1>
            <p className="text-sm text-muted-foreground">Track and view inward inventory supplies and outstanding supplier balances</p>
          </div>
          <Link
            href="/purchase-vouchers/new"
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            New Purchase Entry
            <ShortcutHint keys={['F9']} />
          </Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 border border-border rounded-xl">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" /> Filter by Supplier
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-foreground text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-foreground text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-foreground text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card/50 backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No purchase vouchers found. Add a new stock purchase ledger entry!
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-medium bg-muted/50">
                  <th className="p-4">Date</th>
                  <th className="p-4">Voucher ID</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 text-right">Taxable Total</th>
                  <th className="p-4 text-right">GST Total</th>
                  <th className="p-4 text-right">Grand Total</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                {vouchers.map((voucher, i) => (
                  <tr
                    key={voucher.id}
                    ref={(el) => { rowRefs.current[i] = el; }}
                    tabIndex={-1}
                    onClick={() => { setFocusedIndex(i); handleViewDetails(voucher.id); }}
                    onFocus={() => setFocusedIndex(i)}
                    className={`transition-colors cursor-pointer ${
                      i === focusedIndex ? 'bg-accent/50 ring-1 ring-emerald-500/30' : 'hover:bg-accent/25'
                    }`}
                  >
                    <td className="p-4 text-muted-foreground">
                      {new Date(voucher.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-mono text-muted-foreground text-xs truncate max-w-[120px]" title={voucher.id}>
                      {voucher.id}
                    </td>
                    <td className="p-4 font-semibold text-foreground">{voucher.suppliers?.name || 'Deleted Supplier'}</td>
                    <td className="p-4 text-right text-muted-foreground">₹{Number(voucher.total_amount).toFixed(2)}</td>
                    <td className="p-4 text-right text-muted-foreground">₹{Number(voucher.gst_amount).toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-foreground">₹{Number(voucher.grand_total).toFixed(2)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleViewDetails(voucher.id)}
                          className="p-1.5 rounded bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Purchase Details Dialog */}
      {viewVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-border bg-card/50">
              <h3 className="text-lg font-bold text-foreground">
                Purchase Voucher Details
              </h3>
              <button 
                onClick={() => setViewVoucher(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Supplier Info */}
              <div className="grid grid-cols-2 gap-6 bg-background p-4 rounded-lg border border-border">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inward From:</h4>
                  <p className="font-bold text-foreground">{viewVoucher.suppliers?.name}</p>
                  <p className="text-sm text-muted-foreground">{viewVoucher.suppliers?.mobile || 'No Mobile'}</p>
                  <p className="text-sm text-muted-foreground mt-1">{viewVoucher.suppliers?.address || 'No Address'}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Voucher Info:</h4>
                  <p className="text-sm text-muted-foreground">Date: <span className="text-foreground">{new Date(viewVoucher.created_at).toLocaleDateString()}</span></p>
                  <p className="text-sm text-muted-foreground mt-1">Status: <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-xs">Received</span></p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                      <th className="p-3">Item Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-right">Cost Price</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground bg-muted/10">
                    {viewVoucher.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="p-3 font-semibold text-foreground">{item.stock_items?.name}</td>
                        <td className="p-3 font-mono text-muted-foreground text-xs">{item.stock_items?.sku}</td>
                        <td className="p-3 text-right text-muted-foreground">₹{Number(item.rate).toFixed(2)}</td>
                        <td className="p-3 text-right text-muted-foreground">{item.quantity} {item.stock_items?.unit}</td>
                        <td className="p-3 text-right text-foreground">₹{Number(item.line_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Final Calculations */}
              <div className="flex flex-col items-end space-y-2 border-t border-border pt-4">
                <div className="flex justify-between w-64 text-sm text-muted-foreground">
                  <span>Subtotal (Excl. GST):</span>
                  <span className="text-foreground">₹{Number(viewVoucher.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-64 text-sm text-muted-foreground">
                  <span>Tax (GST):</span>
                  <span className="text-foreground">₹{Number(viewVoucher.gst_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-64 border-t border-border pt-2 font-bold text-base text-foreground">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400">₹{Number(viewVoucher.grand_total).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  onClick={() => setViewVoucher(null)}
                  className="px-5 py-2.5 text-sm font-semibold bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors"
                >
                  Close
                  <ShortcutHint keys={['Esc']} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
