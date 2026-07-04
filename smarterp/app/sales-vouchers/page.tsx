'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { useShortcutHandler } from '@/components/shortcut-context';
import { ShortcutHint } from '@/components/shortcut-hint';
import { Plus, Download, Eye, Calendar, User, Printer, X } from 'lucide-react';

interface Voucher {
  id: string;
  invoice_number: string;
  customer_id: string;
  total_amount: number;
  gst_amount: number;
  grand_total: number;
  created_at: string;
  customers: {
    name: string;
    mobile: string | null;
  };
}

interface Customer {
  id: string;
  name: string;
}

export default function SalesVouchersPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active view modal (to view invoice details in popup)
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
      if (selectedCustomerId) params.push(`customerId=${selectedCustomerId}`);
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) {
        query = '?' + params.join('&');
      }

      const res = await apiFetch(`/api/sales-vouchers${query}`);
      if (res.ok) {
        const data = await res.json();
        setVouchers(data);
      }
    } catch (err) {
      console.error('Error fetching sales vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchVouchers();
  }, [selectedCustomerId, startDate, endDate]);

  const handleDownloadPdf = async (id: string, invoiceNumber: string) => {
    try {
      const res = await apiFetch(`/api/sales-vouchers/${id}/pdf`);
      if (!res.ok) {
        throw new Error('Failed to generate PDF invoice.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error occurred during PDF download.');
    }
  };

  const handleViewDetails = async (id: string) => {
    setViewLoading(true);
    setViewVoucher(null);
    try {
      const res = await apiFetch(`/api/sales-vouchers/${id}`);
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

  const handleDownloadCurrentPdf = async () => {
    if (viewVoucher) {
      await handleDownloadPdf(viewVoucher.id, viewVoucher.invoice_number);
    }
  };

  const handlePrintCurrent = async () => {
    if (viewVoucher) {
      const res = await apiFetch(`/api/sales-vouchers/${viewVoucher.id}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => printWindow.print();
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      }
    }
  };

  useShortcutHandler('refresh', fetchVouchers);
  useShortcutHandler('newSalesVoucher', () => router.push('/sales-vouchers/new'));
  useShortcutHandler('esc', viewVoucher ? () => setViewVoucher(null) : null);
  useShortcutHandler('downloadPdf', viewVoucher ? handleDownloadCurrentPdf : null);
  useShortcutHandler('print', viewVoucher ? handlePrintCurrent : null);

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
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Sales Vouchers</h1>
            <p className="text-sm text-muted-foreground">View past client sales invoices, check GST totals, and download PDFs</p>
          </div>
          <Link
            href="/sales-vouchers/new"
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            Create Sales Voucher
            <ShortcutHint keys={['F8']} />
          </Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 border border-border rounded-xl">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" /> Filter by Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-foreground text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              No sales vouchers found. Add your first sales transaction!
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-medium bg-muted/50">
                  <th className="p-4">Date</th>
                  <th className="p-4">Invoice No</th>
                  <th className="p-4">Customer</th>
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
                    <td className="p-4 font-mono font-semibold text-emerald-400">
                      {voucher.invoice_number}
                    </td>
                    <td className="p-4 font-semibold text-foreground">{voucher.customers?.name || 'Deleted Customer'}</td>
                    <td className="p-4 text-right text-muted-foreground">₹{Number(voucher.total_amount).toFixed(2)}</td>
                    <td className="p-4 text-right text-muted-foreground">₹{Number(voucher.gst_amount).toFixed(2)}</td>
                    <td className="p-4 text-right font-bold text-foreground">₹{Number(voucher.grand_total).toFixed(2)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleViewDetails(voucher.id)}
                          className="p-1.5 rounded bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(voucher.id, voucher.invoice_number)}
                          className="p-1.5 rounded bg-accent text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
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

      {/* Invoice Details Dialog */}
      {(viewVoucher || viewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-border bg-card/50">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                Sales Invoice: <span className="font-mono text-emerald-400">{viewVoucher?.invoice_number}</span>
              </h3>
              <button 
                onClick={() => setViewVoucher(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {viewLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
              </div>
            ) : (
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Billing Summary */}
                <div className="grid grid-cols-2 gap-6 bg-background p-4 rounded-lg border border-border">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billing To:</h4>
                    <p className="font-bold text-foreground">{viewVoucher.customers?.name}</p>
                    <p className="text-sm text-muted-foreground">{viewVoucher.customers?.mobile || 'No Mobile'}</p>
                    <p className="text-sm text-muted-foreground mt-1">{viewVoucher.customers?.address || 'No Address'}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice Summary:</h4>
                    <p className="text-sm text-muted-foreground">Date: <span className="text-foreground">{new Date(viewVoucher.created_at).toLocaleDateString()}</span></p>
                    <p className="text-sm text-muted-foreground mt-1">Status: <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-xs">Settled</span></p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                        <th className="p-3">Item Name</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3 text-right">Price</th>
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
                    <span>Subtotal:</span>
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

                {/* Download Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                  <button
                    onClick={() => setViewVoucher(null)}
                    className="px-4 py-2 text-sm font-semibold border border-border text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
                  >
                    Close
                    <ShortcutHint keys={['Esc']} />
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(viewVoucher.id, viewVoucher.invoice_number)}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg shadow-md transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                    <ShortcutHint keys={['Alt', 'D']} />
                  </button>
                  <button
                    onClick={handlePrintCurrent}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-accent hover:bg-accent/80 text-foreground rounded-lg shadow-md transition-all"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                    <ShortcutHint keys={['Alt', 'P']} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
