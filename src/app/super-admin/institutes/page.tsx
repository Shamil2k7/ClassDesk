'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Building2,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  ExternalLink,
  ChevronRight,
  Eye,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ArrowLeft,
  X,
  Lock,
} from 'lucide-react';
import { Institute } from '@/types/app.types';
import { createClient } from '@/lib/supabase/client';
import { getLocalData, saveLocalData, syncLocalWithRemote } from '@/lib/storage-helper';

export default function SuperAdminInstitutesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Status Change Confirmation Modal
  const [statusModalInst, setStatusModalInst] = useState<Institute | null>(null);
  const [targetStatus, setTargetStatus] = useState<'active' | 'pending' | 'suspended' | 'inactive'>('active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Success / Error banners
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Onboard Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'school' | 'tuition_center' | 'coaching'>('school');
  const [newPhone, setNewPhone] = useState('+91 ');
  const [newEmail, setNewEmail] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('Kerala');
  const [newAddress, setNewAddress] = useState('');
  const [newPlan, setNewPlan] = useState('standard');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('admin123');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Institutes
  const loadInstitutes = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try server API route
      const res = await fetch('/api/institutes');
      if (res.ok) {
        const json = await res.json();
        if (json.institutes && Array.isArray(json.institutes)) {
          setInstitutes(syncLocalWithRemote('institutes', json.institutes as Institute[]));
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to Supabase client
      const { data, error } = await supabase
        .from('institutes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setInstitutes(syncLocalWithRemote('institutes', data as Institute[]));
      } else {
        setInstitutes(getLocalData<Institute>('institutes'));
      }
    } catch {
      setInstitutes(getLocalData<Institute>('institutes'));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const local = getLocalData<Institute>('institutes');
    if (local.length > 0) setInstitutes(local);
    loadInstitutes();
  }, [loadInstitutes]);

  // Handle Status Update
  const handleConfirmStatusChange = async () => {
    if (!statusModalInst) return;
    setIsUpdatingStatus(true);
    setActionError(null);

    try {
      const res = await fetch('/api/institutes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: statusModalInst.id,
          status: targetStatus,
          subscription_status: targetStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update status');
      }

      // Update local state
      setInstitutes((prev) =>
        prev.map((inst) =>
          inst.id === statusModalInst.id
            ? {
                ...inst,
                status: targetStatus,
                subscription_status: targetStatus,
              }
            : inst
        )
      );

      setActionSuccess(
        `Institute "${statusModalInst.name}" status updated to ${targetStatus.toUpperCase()}.`
      );
      setStatusModalInst(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Onboard New Institute
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setActionError('Institute name is required');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch('/api/institutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          institute_type: newType,
          phone: newPhone.replace(/\s+/g, ''),
          email: newEmail.trim() || undefined,
          city: newCity.trim() || 'Kochi',
          state: newState || 'Kerala',
          address: newAddress.trim() || 'Main Campus Road',
          subscription_plan: newPlan,
          admin_name: newAdminName.trim() || undefined,
          admin_email: newAdminEmail.trim() || undefined,
          admin_password: newAdminPassword || 'admin123',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to onboard institute');
      }

      if (json.institute) {
        setInstitutes((prev) => [json.institute, ...prev]);
      }

      setActionSuccess(`Institute "${newName}" successfully registered!`);
      setShowAddModal(false);
      // Reset form
      setNewName('');
      setNewCity('');
      setNewPhone('+91 ');
      setNewEmail('');
      setNewAdminName('');
      setNewAdminEmail('');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error onboarding institute');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered & Sorted Institutes
  const filteredInstitutes = useMemo(() => {
    return institutes
      .filter((inst) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = inst.name?.toLowerCase().includes(q);
          const matchEmail = inst.email?.toLowerCase().includes(q);
          const matchSlug = inst.slug?.toLowerCase().includes(q);
          const matchCity = inst.city?.toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchSlug && !matchCity) return false;
        }

        // Status Filter
        if (filterStatus !== 'all') {
          const currentStatus = inst.status || inst.subscription_status || 'active';
          if (currentStatus.toLowerCase() !== filterStatus.toLowerCase()) return false;
        }

        // Plan Filter
        if (filterPlan !== 'all') {
          if ((inst.subscription_plan || 'standard').toLowerCase() !== filterPlan.toLowerCase())
            return false;
        }

        // Type Filter
        if (filterType !== 'all') {
          const currentType =
            inst.institute_type || inst.settings?.institute_type || 'school';
          if (currentType.toLowerCase() !== filterType.toLowerCase()) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
        if (sortBy === 'date_asc')
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [institutes, searchQuery, filterStatus, filterPlan, filterType, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredInstitutes.length / pageSize) || 1;
  const paginatedInstitutes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInstitutes.slice(start, start + pageSize);
  }, [filteredInstitutes, currentPage, pageSize]);

  // Statistics counters
  const statusCounts = useMemo(() => {
    return {
      total: institutes.length,
      active: institutes.filter(
        (i) => (i.status || i.subscription_status || 'active') === 'active'
      ).length,
      suspended: institutes.filter(
        (i) => (i.status || i.subscription_status) === 'suspended'
      ).length,
      pending: institutes.filter(
        (i) => (i.status || i.subscription_status) === 'pending'
      ).length,
      inactive: institutes.filter(
        (i) =>
          (i.status || i.subscription_status) === 'inactive' ||
          (i.status || i.subscription_status) === 'canceled'
      ).length,
    };
  }, [institutes]);

  const renderStatusBadge = (statusStr?: string) => {
    const s = (statusStr || 'active').toLowerCase();
    if (s === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      );
    }
    if (s === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <ShieldAlert className="w-3 h-3 text-rose-600" />
          Suspended
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Inactive
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/super-admin" className="hover:text-indigo-600 transition-colors">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Institutes</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <span>Institute Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of all registered schools, tuition centers, and coaching academies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>SaaS Command Center</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Institute</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-900">{actionSuccess}</p>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-xs font-semibold text-rose-900">{actionError}</p>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setFilterStatus('all')}
          className={`cursor-pointer bg-white p-4 rounded-3xl border transition-all ${
            filterStatus === 'all'
              ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Institutes
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">{statusCounts.total}</p>
        </div>

        <div
          onClick={() => setFilterStatus('active')}
          className={`cursor-pointer bg-white p-4 rounded-3xl border transition-all ${
            filterStatus === 'active'
              ? 'border-emerald-600 ring-2 ring-emerald-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Active Accounts
          </p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{statusCounts.active}</p>
        </div>

        <div
          onClick={() => setFilterStatus('suspended')}
          className={`cursor-pointer bg-white p-4 rounded-3xl border transition-all ${
            filterStatus === 'suspended'
              ? 'border-rose-600 ring-2 ring-rose-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
            Suspended
          </p>
          <p className="text-2xl font-black text-rose-700 mt-1">{statusCounts.suspended}</p>
        </div>

        <div
          onClick={() => setFilterStatus('pending')}
          className={`cursor-pointer bg-white p-4 rounded-3xl border transition-all ${
            filterStatus === 'pending'
              ? 'border-amber-600 ring-2 ring-amber-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
            Pending / Inactive
          </p>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {statusCounts.pending + statusCounts.inactive}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by institute name, email, slug, city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-2xl pl-10 pr-4 py-2.5 font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl px-3 py-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="pending">Pending Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Plan Filter */}
            <select
              value={filterPlan}
              onChange={(e) => {
                setFilterPlan(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl px-3 py-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic Plan</option>
              <option value="standard">Standard Plan</option>
              <option value="pro">Pro Enterprise</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl px-3 py-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="school">School</option>
              <option value="tuition_center">Tuition Center</option>
              <option value="coaching">Coaching Academy</option>
              <option value="college">College</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl px-3 py-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Institutes Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-slate-500">Loading institute directory...</p>
          </div>
        ) : paginatedInstitutes.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Institutes Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No registered tuition centres or schools match your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Institute</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Contact Person</th>
                  <th className="py-3.5 px-3">Location</th>
                  <th className="py-3.5 px-3">Subscription</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInstitutes.map((inst) => {
                  const typeLabel =
                    inst.institute_type || inst.settings?.institute_type || 'school';
                  const formattedType =
                    typeLabel === 'tuition_center'
                      ? 'Tuition Center'
                      : typeLabel === 'coaching'
                      ? 'Coaching Academy'
                      : typeLabel === 'college'
                      ? 'College'
                      : 'School';

                  const currentStatus = (inst.status || inst.subscription_status || 'active').toLowerCase();

                  return (
                    <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Logo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {inst.logo_url ? (
                              <img
                                src={inst.logo_url}
                                alt={inst.name}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/super-admin/institutes/${inst.id}`}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors block truncate"
                            >
                              {inst.name}
                            </Link>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                              /{inst.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                          {formattedType}
                        </span>
                      </td>

                      {/* Contact Person */}
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-semibold text-slate-800 truncate">
                            {inst.phone || 'No phone'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {inst.email || 'No email'}
                          </p>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3">
                        <span className="text-slate-600 text-xs">
                          {inst.city ? `${inst.city}, ${inst.state || 'KL'}` : 'Kerala, India'}
                        </span>
                      </td>

                      {/* Subscription Plan */}
                      <td className="py-3 px-3">
                        <span className="capitalize font-bold text-slate-800 text-[11px] block">
                          {inst.subscription_plan || 'Standard'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Since {new Date(inst.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">{renderStatusBadge(inst.status || inst.subscription_status)}</td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <Link
                            href={`/super-admin/institutes/${inst.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </Link>

                          {/* Quick status switch dropdown/button */}
                          {currentStatus === 'suspended' ? (
                            <button
                              onClick={() => {
                                setStatusModalInst(inst);
                                setTargetStatus('active');
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setStatusModalInst(inst);
                                setTargetStatus('suspended');
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-bold text-slate-800">
              {filteredInstitutes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * pageSize, filteredInstitutes.length)}
            </span>{' '}
            of <span className="font-bold text-slate-800">{filteredInstitutes.length}</span> institutes
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Status Change Confirmation Modal */}
      {statusModalInst && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>Confirm Status Change</span>
              </div>
              <button
                onClick={() => setStatusModalInst(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to change the status of{' '}
                <strong className="text-slate-900">{statusModalInst.name}</strong> to{' '}
                <span className="font-bold uppercase text-indigo-700">{targetStatus}</span>.
              </p>

              {targetStatus === 'suspended' && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 space-y-1">
                  <p className="font-bold">Impact of Suspension:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>All teachers, admins, and parents belonging to this center will be blocked from accessing protected features.</li>
                    <li>They will see an official account suspension banner upon attempting to log in.</li>
                    <li><strong>No data will be deleted.</strong> All student records, attendance, and fee history remain preserved.</li>
                    <li>You can reactivate this institute at any time.</li>
                  </ul>
                </div>
              )}

              {targetStatus === 'active' && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800">
                  Reactivating will immediately restore full portal access for all authorized staff and parents.
                </div>
              )}

              {/* Status Selector */}
              <div className="mt-4">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Target Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-2xl p-2.5"
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="suspended">Suspended (Blocked Access)</option>
                  <option value="pending">Pending Review</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusModalInst(null)}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmStatusChange}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
                  targetStatus === 'suspended'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm {targetStatus.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard New Institute Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <Building2 className="w-5 h-5" />
                <span>Onboard New Educational Institute</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Institute Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greenwood High School / Apex Tuition Center"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium focus:bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Institute Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                  >
                    <option value="school">K-12 School</option>
                    <option value="tuition_center">Tuition Center</option>
                    <option value="coaching">Coaching Academy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                  >
                    <option value="basic">Starter Plan (₹999/mo)</option>
                    <option value="standard">Standard Plan (₹2,499/mo)</option>
                    <option value="pro">Pro Enterprise (₹4,999/mo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kochi / Kozhikode"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Official Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                  />
                </div>
              </div>

              {/* Initial Admin Details */}
              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                <p className="text-[11px] font-bold text-indigo-900 uppercase">
                  Primary Institute Administrator
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Admin Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Principal / Owner"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Admin Login Email
                    </label>
                    <input
                      type="email"
                      placeholder="admin@school.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Complete Onboarding</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
