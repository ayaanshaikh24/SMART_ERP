'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { useAuth } from '@/components/auth-provider';
import { useShortcutHandler } from '@/components/shortcut-context';
import { ShortcutHint } from '@/components/shortcut-hint';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  mobile: string | null;
  address: string | null;
  outstanding_balance: number;
}

export default function CustomersPage() {
  const { apiFetch } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Table keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const fetchCustomers = async (query = '') => {
    try {
      const res = await apiFetch(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    fetchCustomers(value);
  };

  const openAddModal = () => {
    setEditCustomer(null);
    setName('');
    setMobile('');
    setAddress('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditCustomer(customer);
    setName(customer.name);
    setMobile(customer.mobile || '');
    setAddress(customer.address || '');
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
      if (editCustomer) {
        res = await apiFetch(`/api/customers/${editCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/api/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save customer details.');
      }

      setModalOpen(false);
      fetchCustomers(search);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useShortcutHandler('refresh', fetchCustomers);
  useShortcutHandler('addCustomer', openAddModal);
  useShortcutHandler('esc', modalOpen ? () => setModalOpen(false) : null);

  // Table keyboard navigation
  useShortcutHandler('tableArrowDown', !modalOpen && customers.length > 0 ? () => {
    setFocusedIndex((prev) => {
      const next = Math.min(prev + 1, customers.length - 1);
      rowRefs.current[next]?.focus();
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  } : null);
  useShortcutHandler('tableArrowUp', !modalOpen && customers.length > 0 ? () => {
    setFocusedIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      rowRefs.current[next]?.focus();
      rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  } : null);
  useShortcutHandler('tableEnter', !modalOpen && focusedIndex >= 0 ? () => {
    openEditModal(customers[focusedIndex]);
  } : null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer record?')) return;

    try {
      const res = await apiFetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete customer.');
      } else {
        fetchCustomers(search);
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
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Customer Ledgers</h1>
            <p className="text-sm text-zinc-400">Manage your business customers and view outstanding account balances</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Customer
            <ShortcutHint keys={['F6']} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center max-w-md bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <Search className="h-5 w-5 text-zinc-500 mr-2" />
          <input
            type="text"
            placeholder="Search by customer name or mobile..."
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
          ) : customers.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              No customers found. Try adding a new customer ledger!
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
                {customers.map((customer, i) => (
                  <tr
                    key={customer.id}
                    ref={(el) => { rowRefs.current[i] = el; }}
                    tabIndex={-1}
                    onClick={() => { setFocusedIndex(i); openEditModal(customer); }}
                    onFocus={() => setFocusedIndex(i)}
                    className={`transition-colors cursor-pointer ${
                      i === focusedIndex ? 'bg-zinc-800/40 ring-1 ring-emerald-500/30' : 'hover:bg-zinc-900/25'
                    }`}
                  >
                    <td className="p-4 font-semibold text-white">{customer.name}</td>
                    <td className="p-4 text-zinc-400">{customer.mobile || '—'}</td>
                    <td className="p-4 max-w-xs truncate text-zinc-400" title={customer.address || ''}>
                      {customer.address || '—'}
                    </td>
                    <td className={`p-4 text-right font-bold ${customer.outstanding_balance > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>
                      ₹{Number(customer.outstanding_balance).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                          title="Edit Customer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete Customer"
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
                {editCustomer ? 'Edit Customer Details' : 'Add New Customer'}
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
                    Full Name *
                  </label>
                  <input
                    id="modal-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter customer name"
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
                    Billing Address
                  </label>
                  <textarea
                    id="modal-address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter customer address details"
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
                  {submitting ? 'Saving...' : 'Save Customer'}
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
