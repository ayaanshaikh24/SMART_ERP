'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { useShortcutHandler, useShortcuts } from '@/components/shortcut-context';
import { ShortcutHint } from '@/components/shortcut-hint';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  sku: string;
  unit: 'PCS' | 'KG' | 'BOX' | 'LTR';
  purchase_price: number;
  selling_price: number;
  gst_percent: number;
  quantity: number;
}

export default function StockItemsPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<'PCS' | 'KG' | 'BOX' | 'LTR'>('PCS');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [gstPercent, setGstPercent] = useState('18'); // Default standard rate

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Table keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const fetchItems = async (query = '') => {
    try {
      const res = await apiFetch(`/api/stock-items${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Error fetching stock items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    fetchItems(value);
  };

  const openAddModal = () => {
    setEditItem(null);
    setName('');
    setSku('');
    setUnit('PCS');
    setPurchasePrice('');
    setSellingPrice('');
    setGstPercent('18');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditItem(item);
    setName(item.name);
    setSku(item.sku);
    setUnit(item.unit);
    setPurchasePrice(item.purchase_price.toString());
    setSellingPrice(item.selling_price.toString());
    setGstPercent(item.gst_percent.toString());
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const payload = {
        name,
        sku: sku.toUpperCase().trim(),
        unit,
        purchase_price: Number(purchasePrice),
        selling_price: Number(sellingPrice),
        gst_percent: Number(gstPercent),
      };

      let res;
      if (editItem) {
        res = await apiFetch(`/api/stock-items/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/api/stock-items', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save stock item details.');
      }

      setModalOpen(false);
      fetchItems(search);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const { consumePendingIntent } = useShortcuts();

  useEffect(() => {
    const intent = consumePendingIntent();
    if (intent === 'addStockItem') {
      openAddModal();
    }
  }, []);

  useShortcutHandler('refresh', fetchItems);
  useShortcutHandler('addStockItem', openAddModal);
  useShortcutHandler('esc', modalOpen ? () => setModalOpen(false) : null);

  // Table keyboard navigation
  useShortcutHandler('tableArrowDown', !modalOpen && items.length > 0 ? () => {
    setFocusedIndex((prev) => {
      const next = Math.min(prev + 1, items.length - 1);
      rowRefs.current[next]?.focus();
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  } : null);
  useShortcutHandler('tableArrowUp', !modalOpen && items.length > 0 ? () => {
    setFocusedIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      rowRefs.current[next]?.focus();
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  } : null);
  useShortcutHandler('tableEnter', !modalOpen && focusedIndex >= 0 ? () => {
    openEditModal(items[focusedIndex]);
  } : null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this stock item?')) return;

    try {
      const res = await apiFetch(`/api/stock-items/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete item.');
      } else {
        fetchItems(search);
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred during deletion.');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Stock Items</h1>
            <p className="text-sm text-zinc-400">View and manage your inventory master catalog and current stock levels</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Item
            <ShortcutHint keys={['F10']} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center max-w-md bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <Search className="h-5 w-5 text-zinc-500 mr-2" />
          <input
            type="text"
            placeholder="Search by item name or SKU..."
            value={search}
            onChange={handleSearchChange}
            className="bg-transparent border-0 outline-none text-sm text-white placeholder-zinc-500 w-full focus:ring-0"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              No stock items found. Add a new item to your catalog!
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-900/30">
                  <th className="p-4">SKU</th>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4 text-right">Purchase Price</th>
                  <th className="p-4 text-right">Selling Price</th>
                  <th className="p-4 text-right">GST %</th>
                  <th className="p-4 text-right">Current Stock</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    ref={(el) => { rowRefs.current[i] = el; }}
                    tabIndex={-1}
                    onClick={() => { setFocusedIndex(i); openEditModal(item); }}
                    onFocus={() => setFocusedIndex(i)}
                    className={`transition-colors cursor-pointer ${
                      i === focusedIndex ? 'bg-zinc-800/40 ring-1 ring-emerald-500/30' : 'hover:bg-zinc-900/25'
                    }`}
                  >
                    <td className="p-4 font-mono font-semibold text-emerald-400">{item.sku}</td>
                    <td className="p-4 font-semibold text-white">{item.name}</td>
                    <td className="p-4 text-zinc-400">
                      <span className="bg-zinc-800 px-2 py-1 rounded text-xs">{item.unit}</span>
                    </td>
                    <td className="p-4 text-right text-zinc-300">₹{Number(item.purchase_price).toFixed(2)}</td>
                    <td className="p-4 text-right text-zinc-300">₹{Number(item.selling_price).toFixed(2)}</td>
                    <td className="p-4 text-right text-zinc-400">{Number(item.gst_percent).toFixed(0)}%</td>
                    <td className={`p-4 text-right font-bold ${item.quantity < 10 ? 'text-rose-400' : 'text-emerald-500'}`}>
                      {Number(item.quantity).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                          title="Edit Item"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Custom Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-lg font-bold text-white">
                {editItem ? 'Edit Stock Item' : 'Add New Stock Item'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="modal-name" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Item Name *
                  </label>
                  <input
                    id="modal-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Wireless Mouse"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="modal-sku" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      SKU (Unique Code) *
                    </label>
                    <input
                      id="modal-sku"
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. MOUSE-001"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="modal-unit" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Stock Unit *
                    </label>
                    <select
                      id="modal-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
                    >
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="KG">KG (Kilograms)</option>
                      <option value="BOX">BOX (Boxes)</option>
                      <option value="LTR">LTR (Litres)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="modal-purchase-price" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Purchase Price (₹) *
                    </label>
                    <input
                      id="modal-purchase-price"
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="modal-selling-price" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Selling Price (₹) *
                    </label>
                    <input
                      id="modal-selling-price"
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-gst" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    GST Percent (%) *
                  </label>
                  <input
                    id="modal-gst"
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                    placeholder="18"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-650 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800 bg-zinc-900/30">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold border border-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Cancel
                  <ShortcutHint keys={['Esc']} />
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Stock Item'}
                  <ShortcutHint keys={['Alt', 'A']} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
