'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { useShortcutHandler } from '@/components/shortcut-context';
import { 
  Users, 
  Truck, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  ArrowUpRight 
} from 'lucide-react';

interface CountSummary {
  customers: number;
  suppliers: number;
  stockItems: number;
}

interface RecentSale {
  id: string;
  invoice_number: string;
  grand_total: number;
  created_at: string;
  customers: {
    name: string;
  };
}

interface RecentPurchase {
  id: string;
  grand_total: number;
  created_at: string;
  suppliers: {
    name: string;
  };
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
}

interface DashboardData {
  counts: CountSummary;
  recentSales: RecentSale[];
  recentPurchases: RecentPurchase[];
  lowStockItems: LowStockItem[];
}

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await apiFetch('/api/dashboard');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching dashboard details:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useShortcutHandler('refresh', fetchDashboardData);

  const handleDownloadInvoice = async (id: string, invoiceNumber: string) => {
    try {
      const res = await apiFetch(`/api/sales-vouchers/${id}/pdf`);
      if (!res.ok) throw new Error('Failed to download invoice');
      
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
      alert(err.message || 'Error occurred during invoice download.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Top welcome banner */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">SmartERP Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time business insights, inventory alerts, and billing metrics</p>
        </div>

        {/* Counts summary widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border p-6 rounded-xl relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Customers</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Users className="h-5 w-5" /></span>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-foreground">{data.counts.customers}</span>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Active accounts in ledger
              </p>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Suppliers</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Truck className="h-5 w-5" /></span>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-foreground">{data.counts.suppliers}</span>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Active suppliers registered
              </p>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Stock Items</span>
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Package className="h-5 w-5" /></span>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-foreground">{data.counts.stockItems}</span>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Cataloged inventory products
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {data.lowStockItems.length > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/25 p-5 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Low Stock Warnings (Qty &lt; 10)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {data.lowStockItems.map((item) => (
                <div key={item.id} className="bg-muted p-3 rounded-lg border border-border flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-foreground text-sm truncate" title={item.name}>{item.name}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{item.sku}</p>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-xs text-muted-foreground">Available Stock:</span>
                    <span className="font-bold text-rose-400 text-sm">{Number(item.quantity).toFixed(0)} {item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions Splits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales Invoices */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Recent Sales Invoices
              </h3>
              <Link href="/sales-vouchers" className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                View All <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {data.recentSales.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No recent sales vouchers recorded.</p>
            ) : (
              <div className="space-y-3">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-border transition-colors">
                    <div>
                      <p className="font-bold text-foreground text-sm">{sale.customers?.name || 'Customer'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-emerald-400 font-semibold">{sale.invoice_number}</span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-foreground text-sm">₹{Number(sale.grand_total).toFixed(2)}</span>
                      <button
                        onClick={() => handleDownloadInvoice(sale.id, sale.invoice_number)}
                        className="p-1.5 rounded bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Download Invoice PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
 
          {/* Recent Stock Purchases */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Recent Purchase Entries
              </h3>
              <Link href="/purchase-vouchers" className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                View All <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {data.recentPurchases.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No recent purchase vouchers recorded.</p>
            ) : (
              <div className="space-y-3">
                {data.recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-border transition-colors">
                    <div>
                      <p className="font-bold text-foreground text-sm">{purchase.suppliers?.name || 'Supplier'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-muted-foreground text-xxs truncate max-w-[80px]">{purchase.id}</span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-xs text-muted-foreground">{new Date(purchase.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="font-bold text-foreground text-sm pr-2">₹{Number(purchase.grand_total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
