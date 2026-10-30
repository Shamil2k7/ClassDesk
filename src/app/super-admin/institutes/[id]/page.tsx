'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Building2,
  ArrowLeft,
  Users,
  GraduationCap,
  CreditCard,
  Calendar,
  Layers,
  Activity,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Video,
  BookOpen,
  FileText,
  Clock,
  Pencil,
  X,
  Upload,
  Trash2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Institute } from '@/types/app.types';
import { getLocalData, saveLocalData } from '@/lib/storage-helper';

interface InstituteStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalAdmins: number;
  totalActiveUsers: number;
  totalClasses: number;
  totalExams: number;
  totalAttendanceRecords: number;
  totalNotes: number;
  totalOnlineClasses: number;
  financials: {
    totalCollected: number;
    totalPending: number;
    onlineTransactionsCount: number;
    onlineTransactionsAmount: number;
    cashTransactionsCount: number;
    cashTransactionsAmount: number;
  };
}

export default function IndividualInstituteDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.id as string;

  const [institute, setInstitute] = useState<Institute | null>(null);
  const [stats, setStats] = useState<InstituteStats | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'academic' | 'financials' | 'subscription' | 'management' | 'activity'
  >('overview');

  // Modals & Actions
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'active' | 'suspended' | 'pending' | 'inactive'>('active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Copied alert
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPlan, setEditPlan] = useState('standard');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Fetch full details
  const fetchDetails = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/institutes/${instituteId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.institute) {
          setInstitute(data.institute);
          setStats(data.stats);
          setClasses(data.classes || []);
          setTeachers(data.teachers || []);
          setRecentStudents(data.recentStudents || []);
          setRecentPayments(data.recentPayments || []);
          setActivities(data.activities || []);
          setLoading(false);
          return;
        }
      }

      // Fallback: look up in local storage
      const local = getLocalData<Institute>('institutes');
      const found = local.find((i) => i.id === instituteId);
      if (found) {
        setInstitute(found);
      }
    } catch (err) {
      console.warn('Error fetching institute details:', err);
      const local = getLocalData<Institute>('institutes');
      const found = local.find((i) => i.id === instituteId);
      if (found) setInstitute(found);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Sync edit form when institute loads
  useEffect(() => {
    if (institute) {
      setEditName(institute.name || '');
      setEditPhone(institute.phone || '');
      setEditEmail(institute.email || '');
      setEditAddress(institute.address || '');
      setEditCity(institute.city || '');
      setEditState(institute.state || 'Kerala');
      setEditPlan(institute.subscription_plan || 'standard');
    }
  }, [institute]);

  // Copy helpers
  const handleCopy = (text: string, type: 'link' | 'id') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  // Status Change Confirmation
  const handleConfirmStatus = async () => {
    if (!institute) return;
    setIsUpdatingStatus(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/institutes/${institute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update status');

      setInstitute((prev) => (prev ? { ...prev, status: targetStatus, subscription_status: targetStatus } : null));
      setActionSuccess(`Status successfully changed to ${targetStatus.toUpperCase()}`);
      setShowStatusModal(false);
      fetchDetails();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Logo File Upload Handler
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !institute) return;

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setLogoUploadError('Logo file size must be less than 3MB');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('institute_id', institute.id);

      const res = await fetch('/api/institutes/logo', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload logo');

      if (json.logo_url) {
        setInstitute((prev) => (prev ? { ...prev, logo_url: json.logo_url } : null));
        setActionSuccess('Institute branding logo updated successfully!');
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err) {
      setLogoUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Logo Remove Handler
  const handleRemoveLogo = async () => {
    if (!institute || !institute.logo_url) return;
    if (!window.confirm('Are you sure you want to remove the custom logo? The default ClassDesk logo will be displayed instead.')) {
      return;
    }

    setIsUploadingLogo(true);
    try {
      const res = await fetch(`/api/institutes/logo?institute_id=${institute.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to remove logo');

      setInstitute((prev) => (prev ? { ...prev, logo_url: null } : null));
      setActionSuccess('Custom logo removed. Default ClassDesk logo restored.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error removing logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Save Edit Info
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institute) return;

    setIsSavingEdit(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/institutes/${institute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          address: editAddress.trim(),
          city: editCity.trim(),
          state: editState,
          subscription_plan: editPlan,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update institute details');

      setInstitute(json.institute);
      setActionSuccess('Institute details updated successfully!');
      setShowEditModal(false);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating details');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-semibold text-slate-500">Loading institute details & metrics...</p>
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-sm font-bold text-slate-800">Institute Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">No institute exists with ID: {instituteId}</p>
        <Link
          href="/super-admin/institutes"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutes List</span>
        </Link>
      </div>
    );
  }

  const currentStatus = (institute.status || institute.subscription_status || 'active').toLowerCase();
  const isSuspended = currentStatus === 'suspended';
  const loginUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/login?institute=${institute.slug}`
    : `https://classdesk.app/login?institute=${institute.slug}`;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/super-admin" className="hover:text-indigo-600 transition-colors">
              Super Admin
            </Link>
            <span>/</span>
            <Link href="/super-admin/institutes" className="hover:text-indigo-600 transition-colors">
              Institutes
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold truncate max-w-xs">{institute.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <span>{institute.name}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/super-admin/institutes"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Institutes</span>
          </Link>

          {isSuspended ? (
            <button
              onClick={() => {
                setTargetStatus('active');
                setShowStatusModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Reactivate Institute</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setTargetStatus('suspended');
                setShowStatusModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-200 transition-all active:scale-95"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Suspend Institute</span>
            </button>
          )}
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

      {/* Suspended Warning Banner */}
      {isSuspended && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">
                Account Suspended
              </h3>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                This institute account is currently suspended. All teachers, staff, and parents are blocked from accessing protected features. Database records, student rosters, and fees are completely preserved.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setTargetStatus('active');
              setShowStatusModal(true);
            }}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-2xl shrink-0 transition-colors"
          >
            Lift Suspension Now
          </button>
        </div>
      )}

      {/* Hero Overview Card with Logo & Quick Identifiers */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* Logo with upload trigger */}
          <div className="relative group">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden p-1 shadow-xs">
              {institute.logo_url ? (
                <img
                  src={institute.logo_url}
                  alt={institute.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
              )}
            </div>

            <label className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity">
              <Upload className="w-4 h-4 mb-0.5" />
              <span>Change</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoFileChange}
                disabled={isUploadingLogo}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900">{institute.name}</h2>
              {isSuspended ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  Suspended
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active
                </span>
              )}
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                {institute.institute_type || 'School'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>{institute.city || 'Kochi'}, {institute.state || 'Kerala'}</span>
              <span>•</span>
              <span>ID: <code className="font-mono text-slate-700">{institute.id.slice(0, 8)}...</code></span>
              <button
                onClick={() => handleCopy(institute.id, 'id')}
                className="text-indigo-600 hover:text-indigo-800 p-0.5"
                title="Copy Full ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">Dedicated Login:</span>
              <code className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 truncate max-w-xs sm:max-w-md">
                /login?institute={institute.slug}
              </code>
              <button
                onClick={() => handleCopy(loginUrl, 'link')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>
          {institute.logo_url && (
            <button
              onClick={handleRemoveLogo}
              disabled={isUploadingLogo}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
              title="Remove custom logo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Logo</span>
            </button>
          )}
        </div>
      </div>

      {logoUploadError && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs text-rose-800">
          {logoUploadError}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { key: 'overview', label: 'Overview & Profile', icon: Building2 },
          { key: 'users', label: `Users & Stats (${stats?.totalActiveUsers ?? 0})`, icon: Users },
          { key: 'academic', label: `Academic Info (${stats?.totalClasses ?? 0} Classes)`, icon: BookOpen },
          { key: 'financials', label: 'Financial Records', icon: DollarSign },
          { key: 'subscription', label: 'Subscription Plan', icon: Layers },
          { key: 'activity', label: `Activity Log (${activities.length})`, icon: Activity },
          { key: 'management', label: 'Account Controls', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Institute Profile Details</span>
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Official Name</span>
                <span className="font-bold text-slate-900">{institute.name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Slug Identifier</span>
                <span className="font-mono font-bold text-indigo-700">{institute.slug}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Institute Type</span>
                <span className="font-bold capitalize text-slate-800">
                  {institute.institute_type || 'K-12 School'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Registration Date</span>
                <span className="font-semibold text-slate-800">
                  {new Date(institute.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Account Status</span>
                <span className="capitalize font-bold text-slate-800">
                  {institute.status || institute.subscription_status || 'active'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Contact & Campus Location</span>
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Official Phone</span>
                <span className="font-bold text-slate-900">{institute.phone || 'Not set'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Official Email</span>
                <span className="font-semibold text-slate-800">{institute.email || 'Not set'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Campus Address</span>
                <span className="text-slate-800 font-medium text-right max-w-xs">
                  {institute.address || 'Main Campus'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">City / State</span>
                <span className="text-slate-800 font-bold">
                  {institute.city || 'Kochi'}, {institute.state || 'Kerala'} ({institute.pincode || '682001'})
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Receipt Prefix</span>
                <span className="font-mono font-bold text-indigo-700">
                  {institute.settings?.receipt_prefix || 'REC'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & STATISTICS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Students</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalStudents ?? 0}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Teachers</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalTeachers ?? 0}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Total Parents</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalParents ?? 0}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Institute Admins</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalAdmins ?? 0}</p>
            </div>
          </div>

          {/* Teachers Roster */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Faculty / Teachers Directory ({teachers.length})
            </h3>
            {teachers.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No teachers recorded yet for this institute.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{t.full_name}</p>
                      <p className="text-[11px] text-slate-500">{t.email || t.phone}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Joined {new Date(t.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMIC INFO */}
      {activeTab === 'academic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Classes & Batches</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">{stats?.totalClasses ?? 0}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Exams Scheduled</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">{stats?.totalExams ?? 0}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Attendance Marked</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats?.totalAttendanceRecords ?? 0}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Zoom Online Classes</p>
              <p className="text-2xl font-black text-purple-700 mt-1">{stats?.totalOnlineClasses ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Classes & Batch Distribution
            </h3>
            {classes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No classes added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {classes.map((cls) => (
                  <div key={cls.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{cls.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Section: {cls.section || 'A'} • Year: {cls.academic_year || '2026-27'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIALS */}
      {activeTab === 'financials' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-emerald-600 uppercase">Total Collected</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                ₹{Number(stats?.financials.totalCollected || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-rose-600 uppercase">Outstanding Dues</p>
              <p className="text-2xl font-black text-rose-700 mt-1">
                ₹{Number(stats?.financials.totalPending || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-indigo-600 uppercase">Razorpay Online</p>
              <p className="text-2xl font-black text-indigo-700 mt-1">
                ₹{Number(stats?.financials.onlineTransactionsAmount || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-bold text-slate-600 uppercase">Cash Invoiced</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ₹{Number(stats?.financials.cashTransactionsAmount || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Recent Payments Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Recent Fee Transactions
            </h3>
            {recentPayments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No payments recorded yet for this institute.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {p.receipt_number || 'REC-N/A'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[11px] text-slate-600">
                          {p.payment_method}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {p.payment_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(p.paid_at || p.created_at).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SUBSCRIPTION */}
      {activeTab === 'subscription' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Current SaaS Tier
              </span>
              <h3 className="text-xl font-black text-slate-900 capitalize mt-0.5">
                {institute.subscription_plan || 'Standard'} Plan
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Billing Cycle:</span>
              <p className="text-xs font-bold text-slate-800">Monthly Auto-Renewal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Subscription Status</span>
              <p className="text-base font-bold capitalize text-slate-900 mt-1">
                {institute.subscription_status || 'Active'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Member Since</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {new Date(institute.created_at).toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Next Scheduled Renewal</span>
              <p className="text-base font-bold text-indigo-700 mt-1">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ACTIVITY LOG */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Audited Institute Events ({activities.length})</span>
          </h3>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.map((act) => (
              <div key={act.id} className="relative text-xs">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-indigo-600">
                      {act.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.created_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: ACCOUNT CONTROLS / MANAGEMENT */}
      {activeTab === 'management' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Account Status Transitions
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Switching this institute status updates staff and parent access immediately. Suspended accounts block all teacher and parent logins while keeping all records safely stored in the database.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setTargetStatus('active');
                  setShowStatusModal(true);
                }}
                disabled={currentStatus === 'active'}
                className="px-4 py-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold disabled:opacity-40"
              >
                Set Active
              </button>
              <button
                onClick={() => {
                  setTargetStatus('suspended');
                  setShowStatusModal(true);
                }}
                disabled={currentStatus === 'suspended'}
                className="px-4 py-2.5 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold disabled:opacity-40"
              >
                Suspend Account
              </button>
              <button
                onClick={() => {
                  setTargetStatus('inactive');
                  setShowStatusModal(true);
                }}
                disabled={currentStatus === 'inactive'}
                className="px-4 py-2.5 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 text-xs font-bold disabled:opacity-40"
              >
                Set Inactive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Status Change */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>Confirm Account Status Action</span>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to switch the status of{' '}
                <strong className="text-slate-900">{institute.name}</strong> to{' '}
                <span className="font-bold uppercase text-indigo-700">{targetStatus}</span>.
              </p>

              {targetStatus === 'suspended' && (
                <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 space-y-1">
                  <p className="font-bold">What happens during suspension:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Institute staff, teachers, and parents are immediately blocked from accessing dashboards.</li>
                    <li>They will see an official account suspension banner.</li>
                    <li>No database records or student history are deleted.</li>
                    <li>Super Admins retain full access and can reactivate anytime.</li>
                  </ul>
                </div>
              )}

              {targetStatus === 'active' && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800">
                  Reactivating restores full portal access for teachers, students, and parents.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmStatus}
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

      {/* Edit Details Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <Pencil className="w-4 h-4" />
                <span>Edit Institute Information</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Institute Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-2xl p-2.5 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
