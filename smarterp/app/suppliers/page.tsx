'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { useShortcutHandler, useShortcuts } from '@/components/shortcut-context';
import { ShortcutHint } from '@/components/shortcut-hint';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  mobile: string | null;
  address: string | null;
  outstanding_balance: number;
}

export default function SuppliersPage() {
  const { apiFetch } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Table keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const fetchSuppliers = async (query = '') => {
    try {
      const res = await apiFetch(`/api/suppliers${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    fetchSuppliers(value);
  };

  const openAddModal = () => {
    setEditSupplier(null);
    setName('');
    setMobile('');
    setAddress('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setName(supplier.name);
    setMobile(supplier.mobile || '');
    setAddress(supplier.address || '');
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
        mobile: mobile || null,
        address: address || null,
      };

      let res;
      if (editSupplier) {
        res = await apiFetch(`/api/suppliers/${editSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save supplier details.');
      }

      setModalOpen(false);
      fetchSuppliers(search);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const { consumePendingIntent } = useShortcuts();

  useEffect(() => {
    const intent = consumePendingIntent();
    if (intent === 'addSupplier') {
      openAddModal();
    }
  }, []);

  useShortcutHandler('refresh', fetchSuppliers);
  useShortcutHandler('addSupplier', openAddModal);
  useShortcutHandler('esc', modalOpen ? () => setModalOpen(false) : null);

  // Table keyboard navigation
  useShortcutHandler('tableArrowDown', !modalOpen && suppliers.length > 0 ? () => {
    setFocusedIndex((prev) => {
      const next = Math.min(prev + 1, suppliers.length - 1);
      rowRefs.current[next]?.focus();
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  } : null);
  useShortcutHandler('tableArrowUp', !modalOpen && suppliers.length > 0 ? () => {
    setFocusedIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      rowRefs.current[next]?.focus();
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  } : null);
  useShortcutHandler('tableEnter', !modalOpen && focusedIndex >= 0 ? () => {
    openEditModal(suppliers[focusedIndex]);
  } : null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier record?')) return;

    try {
      const res = await apiFetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete supplier.');
      } else {
        fetchSuppliers(search);
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
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Supplier Ledgers</h1>
            <p className="text-sm text-zinc-400">Manage your product suppliers and track outstanding accounts payable</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
            <ShortcutHint keys={['F7']} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center max-w-md bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <Search className="h-5 w-5 text-zinc-500 mr-2" />
          <input
            type="text"
            placeholder="Search by supplier name or mobile..."
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
          ) : suppliers.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              No suppliers found. Try adding a new supplier ledger!
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-medium bg-zinc-900/30">
                  <th className="p-4">Name</th>
                  <th className="p-4">Mobile Number</th>
                  <th className="p-4">Address</th>
                  <th className="p-4 text-right">Outstanding Balance</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {suppliers.map((supplier, i) => (
                  <tr
                    key={supplier.id}
                    ref={(el) => { rowRefs.current[i] = el; }}
                    tabIndex={-1}
                    onClick={() => { setFocusedIndex(i); openEditModal(supplier); }}
                    onFocus={() => setFocusedIndex(i)}
                    className={`transition-colors cursor-pointer ${
                      i === focusedIndex ? 'bg-zinc-800/40 ring-1 ring-emerald-500/30' : 'hover:bg-zinc-900/25'
                    }`}
                  >
                    <td className="p-4 font-semibold text-white">{supplier.name}</td>
                    <td className="p-4 text-zinc-400">{supplier.mobile || '—'}</td>
                    <td className="p-4 max-w-xs truncate text-zinc-400" title={supplier.address || ''}>
                      {supplier.address || '—'}
                    </td>
                    <td className={`p-4 text-right font-bold ${supplier.outstanding_balance > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>
                      ₹{Number(supplier.outstanding_balance).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEditModal(supplier)}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                          title="Edit Supplier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete Supplier"
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
                {editSupplier ? 'Edit Supplier Details' : 'Add New Supplier'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="modal-name" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Supplier Name *
                  </label>
                  <input
                    id="modal-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter supplier name"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-mobile" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <input
                    id="modal-mobile"
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-address" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Business Address
                  </label>
                  <textarea
                    id="modal-address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter supplier address details"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-colors resize-none"
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
                  {submitting ? 'Saving...' : 'Save Supplier'}
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
