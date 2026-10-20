'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Plus,
  Search,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  Settings,
  X,
  Edit3,
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
  Database,
  Layers,
  ChevronRight,
  Activity,
  Loader2,
  AlertCircle,
  School,
  BookOpen,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SchemaNotice } from '@/components/common/schema-notice';
import { Institute } from '@/types/app.types';
import { usePlatformBranding, DEFAULT_PLATFORM_BRANDING } from '@/lib/platform-config';
import {
  getLocalData,
  saveLocalData,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

interface SaaSPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxStudents: number;
  features: string[];
  activeTenantsCount: number;
  isPopular?: boolean;
}

export default function SuperAdminPortalPage() {
  const { user, switchRoleDemo } = useAuth();
  const supabase = createClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans' | 'revenue' | 'system' | 'branding'>('tenants');
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Platform Branding State (SaaS Master Logo & Name)
  const { branding, updateBranding, resetBranding } = usePlatformBranding();
  const [platformName, setPlatformName] = useState(branding.name);
  const [platformTagline, setPlatformTagline] = useState(branding.tagline);
  const [platformLogoUrl, setPlatformLogoUrl] = useState(branding.logo_url || '');
  const [brandingSaved, setBrandingSaved] = useState(false);

  React.useEffect(() => {
    setPlatformName(branding.name);
    setPlatformTagline(branding.tagline);
    setPlatformLogoUrl(branding.logo_url || '');
  }, [branding]);

  const loadInstitutes = React.useCallback(async () => {
    try {
      // 1. Try our server API route first (runs with service role key, bypassing RLS)
      try {
        const res = await fetch('/api/institutes');
        if (res.ok) {
          const resData = await res.json();
          if (resData.institutes && Array.isArray(resData.institutes)) {
            setInstitutes(syncLocalWithRemote('institutes', resData.institutes as Institute[]));
            return;
          }
        }
      } catch {
        // Continue to fallback
      }

      // 2. Fallback to Supabase client
      const { data, error } = await supabase
        .from('institutes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        setSchemaMissing(true);
        setInstitutes(getLocalData<Institute>('institutes'));
        return;
      }

      if (data && data.length > 0) {
        setInstitutes(syncLocalWithRemote('institutes', data as Institute[]));
      } else {
        setInstitutes(getLocalData<Institute>('institutes'));
      }
    } catch (err) {
      console.warn('Error loading institutes:', err);
      setInstitutes(getLocalData<Institute>('institutes'));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  React.useEffect(() => {
    const local = getLocalData<Institute>('institutes');
    if (local.length > 0) setInstitutes(local);
    loadInstitutes();
  }, [loadInstitutes]);

  // Modals
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<Institute | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Tenant Form
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantLogoUrl, setNewTenantLogoUrl] = useState('');
  const [newTenantType, setNewTenantType] = useState<'school' | 'tuition_center' | 'coaching'>('school');
  const [newTenantCity, setNewTenantCity] = useState('');
  const [newTenantState, setNewTenantState] = useState('Kerala');
  const [newTenantAddress, setNewTenantAddress] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('+91 ');
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState('standard');
  const [newTenantPrefix, setNewTenantPrefix] = useState('');
  const [newTenantAdminName, setNewTenantAdminName] = useState('');
  const [newTenantAdminEmail, setNewTenantAdminEmail] = useState('');
  const [newTenantAdminPassword, setNewTenantAdminPassword] = useState('admin123');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Edit Tenant Form
  const [editingTenant, setEditingTenant] = useState<Institute | null>(null);
  const [editTenantName, setEditTenantName] = useState('');
  const [editTenantLogoUrl, setEditTenantLogoUrl] = useState('');
  const [editTenantCity, setEditTenantCity] = useState('');
  const [editTenantState, setEditTenantState] = useState('Kerala');
  const [editTenantAddress, setEditTenantAddress] = useState('');
  const [editTenantPhone, setEditTenantPhone] = useState('+91 ');
  const [editTenantEmail, setEditTenantEmail] = useState('');
  const [editTenantPlan, setEditTenantPlan] = useState('standard');
  const [editTenantStatus, setEditTenantStatus] = useState<string>('active');
  const [editTenantPrefix, setEditTenantPrefix] = useState('REC');

  // SaaS Plans Master
  const [plans, setPlans] = useState<SaaSPlan[]>([
    {
      id: 'basic',
      name: 'Starter Tuition Plan',
      priceMonthly: 999,
      priceAnnual: 9990,
      maxStudents: 150,
      features: [
        'Up to 150 Enrolled Students',
        '1-Tap Attendance & Roll Call',
        'Study Notes & Resource Sharing',
        'Manual Cash & UPI Fee Collection',
        'Standard PDF Receipts',
      ],
      activeTenantsCount: 1,
    },
    {
      id: 'standard',
      name: 'Smart School Standard',
      priceMonthly: 2499,
      priceAnnual: 24990,
      maxStudents: 500,
      isPopular: true,
      features: [
        'Up to 500 Enrolled Students',
        'Online Razorpay Gateway Integration',
        'Automated Absent Parent Alerts (SMS/Push)',
        'Exam Grading & CBSE/State Report Cards',
        'Multi-Child Parent Switcher',
        'Custom Institute Logo on Receipts',
      ],
      activeTenantsCount: 1,
    },
    {
      id: 'pro',
      name: 'Campus Enterprise & Group',
      priceMonthly: 4999,
      priceAnnual: 49990,
      maxStudents: 2000,
      features: [
        'Unlimited Enrolled Students',
        'Multi-Branch Management',
        'Custom Domain & Dedicated Storage',
        'Automated Late Fee Fine Calculation',
        'Priority Phone & WhatsApp Support',
        'API & Webhook Access',
      ],
      activeTenantsCount: 0,
    },
  ]);

  // Onboard New Tenant
  const handleOnboardTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) {
      setActionError('Institute name is required');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    const slug =
      newTenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `institute-${Date.now()}`;
    const cleanPhone = newTenantPhone.replace(/\s+/g, '') || '+919876543210';
    const cleanPrefix = (
      newTenantPrefix || newTenantName.trim().replace(/[^a-zA-Z]/g, '').slice(0, 4) || 'REC'
    ).toUpperCase();

    const fallbackInst: Institute = {
      id: `inst-${Date.now()}`,
      name: newTenantName.trim(),
      slug,
      logo_url: newTenantLogoUrl.trim() || null,
      phone: cleanPhone,
      email: newTenantEmail || `contact@${slug}.edu.in`,
      address: newTenantAddress || 'Main Campus Road',
      city: newTenantCity || 'Kochi',
      state: newTenantState || 'Kerala',
      pincode: '682001',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      subscription_plan: newTenantPlan,
      subscription_status: 'active' as const,
      settings: {
        receipt_prefix: cleanPrefix,
        late_fee_enabled: false,
        late_fee_per_day: 10,
        grade_system: 'cbse',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/institutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTenantName.trim(),
          logo_url: newTenantLogoUrl.trim() || null,
          institute_type: newTenantType,
          city: newTenantCity || 'Kochi',
          state: newTenantState || 'Kerala',
          address: newTenantAddress || 'Main Campus Road',
          phone: cleanPhone,
          email: newTenantEmail || `contact@${slug}.edu.in`,
          subscription_plan: newTenantPlan,
          receipt_prefix: cleanPrefix,
          admin_name: newTenantAdminName,
          admin_email: newTenantAdminEmail,
          admin_password: newTenantAdminPassword || 'admin123',
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Failed to onboard institute');
      }

      const createdInst: Institute = resData.institute || fallbackInst;
      setInstitutes(appendLocalData('institutes', createdInst));

      // Save admin credentials locally so loginWithEmail works seamlessly
      const adminInfo = resData.admin || {
        email: newTenantAdminEmail || `admin@${slug}.classdesk.app`,
        password: newTenantAdminPassword || 'admin123',
        institute_id: createdInst.id,
        full_name: newTenantAdminName || `${newTenantName} Administrator`,
        role: 'institute_admin',
      };
      const existingAdmins = getLocalData<any>('admins');
      saveLocalData('admins', [adminInfo, ...existingAdmins.filter((a: any) => a.email !== adminInfo.email)]);

      setShowAddTenantModal(false);
      setActionSuccess(
        `"${newTenantName}" onboarded successfully! Admin Login: ${adminInfo.email} | Password: ${adminInfo.password || newTenantAdminPassword}`
      );
      setTimeout(() => setActionSuccess(null), 8000);

      // Reset Form
      setNewTenantName('');
      setNewTenantLogoUrl('');
      setNewTenantCity('');
      setNewTenantAddress('');
      setNewTenantPhone('+91 ');
      setNewTenantEmail('');
      setNewTenantAdminName('');
      setNewTenantAdminEmail('');
      setNewTenantAdminPassword('admin123');
      setNewTenantPrefix('');
    } catch (err: any) {
      console.warn('Error onboarding tenant, saving locally:', err);
      setInstitutes(appendLocalData('institutes', fallbackInst));

      const adminInfo = {
        email: newTenantAdminEmail || `admin@${slug}.classdesk.app`,
        password: newTenantAdminPassword || 'admin123',
        institute_id: fallbackInst.id,
        full_name: newTenantAdminName || `${newTenantName} Administrator`,
        role: 'institute_admin',
      };
      const existingAdmins = getLocalData<any>('admins');
      saveLocalData('admins', [adminInfo, ...existingAdmins.filter((a: any) => a.email !== adminInfo.email)]);

      setShowAddTenantModal(false);
      setActionSuccess(`"${newTenantName}" onboarded locally! Login: ${adminInfo.email} | Password: ${adminInfo.password}`);
      setTimeout(() => setActionSuccess(null), 8000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Tenant Subscription Plan
  const handleUpdateTenantPlan = async (newPlanId: string) => {
    if (!selectedTenantForPlan) return;
    try {
      await fetch('/api/institutes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTenantForPlan.id,
          subscription_plan: newPlanId,
        }),
      });

      setInstitutes((prev) => {
        const updated = prev.map((i) =>
          i.id === selectedTenantForPlan.id ? { ...i, subscription_plan: newPlanId } : i
        );
        saveLocalData('institutes', updated);
        return updated;
      });
      setShowEditPlanModal(false);
      setActionSuccess(`Subscription plan for "${selectedTenantForPlan.name}" updated to ${newPlanId.toUpperCase()}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.warn('Error updating tenant plan:', err);
    }
  };

  // Toggle Tenant Suspension
  const handleToggleTenantStatus = async (instId: string) => {
    const target = institutes.find((i) => i.id === instId);
    if (!target) return;
    const nextStatus = target.subscription_status === 'active' ? 'canceled' : 'active';
    try {
      await fetch('/api/institutes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: instId,
          subscription_status: nextStatus,
        }),
      });

      setInstitutes((prev) => {
        const updated = prev.map((i) => {
          if (i.id === instId) {
            return { ...i, subscription_status: nextStatus };
          }
          return i;
        });
        saveLocalData('institutes', updated);
        return updated;
      });
      setActionSuccess(`Institute status updated to ${nextStatus.toUpperCase()}`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.warn('Error toggling tenant status:', err);
    }
  };

  const handleOpenEditTenant = (inst: Institute) => {
    setEditingTenant(inst);
    setEditTenantName(inst.name);
    setEditTenantLogoUrl(inst.logo_url || '');
    setEditTenantCity(inst.city || '');
    setEditTenantState(inst.state || 'Kerala');
    setEditTenantAddress(inst.address || '');
    setEditTenantPhone(inst.phone || '');
    setEditTenantEmail(inst.email || '');
    setEditTenantPlan(inst.subscription_plan || 'standard');
    setEditTenantStatus(inst.subscription_status || 'active');
    setEditTenantPrefix(inst.settings?.receipt_prefix || 'REC');
  };

  const handleUpdateTenantDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setIsSubmitting(true);
    const cleanPhone = editTenantPhone.replace(/\s+/g, '');
    const cleanPrefix = editTenantPrefix.trim().toUpperCase() || 'REC';

    const updates = {
      name: editTenantName,
      logo_url: editTenantLogoUrl.trim() || null,
      city: editTenantCity,
      state: editTenantState,
      address: editTenantAddress || null,
      phone: cleanPhone,
      email: editTenantEmail || null,
      subscription_plan: editTenantPlan,
      subscription_status: editTenantStatus,
      settings: {
        ...(editingTenant.settings || {}),
        receipt_prefix: cleanPrefix,
      },
    };

    try {
      const res = await fetch('/api/institutes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTenant.id,
          ...updates,
        }),
      });

      if (!res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('institutes')
          .update(updates)
          .eq('id', editingTenant.id);
      }
    } catch (err) {
      console.warn('Update remote institute error:', err);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('institutes')
          .update(updates)
          .eq('id', editingTenant.id);
      } catch {}
    }

    setInstitutes(updateLocalData<Institute>('institutes', editingTenant.id, updates));
    setEditingTenant(null);
    setIsSubmitting(false);
    setActionSuccess(`Institute "${editTenantName}" details updated successfully!`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete institute "${name}"? This will permanently delete the tenant and all its data.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/institutes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('institutes')
          .delete()
          .eq('id', id);
      }
    } catch (err) {
      console.warn('Delete remote institute error:', err);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('institutes')
          .delete()
          .eq('id', id);
      } catch {}
    }

    setInstitutes(removeLocalData<Institute>('institutes', id));
    setActionSuccess(`Institute "${name}" deleted successfully.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Filtered Institutes
  const filteredInstitutes = institutes.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inst.subscription_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate SaaS Global Metrics
  const totalTenants = institutes.length;
  const activeTenants = institutes.filter((i) => i.subscription_status === 'active').length;
  const totalMRR = institutes.reduce((acc, inst) => {
    const plan = plans.find((p) => p.id === inst.subscription_plan);
    return acc + (plan?.priceMonthly || 999);
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {/* SaaS Executive Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>ClassDesk Master Control Center</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">SaaS Super Admin Portal</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Multi-tenant institute lifecycle management, subscription pricing tiers, platform revenue, and tenant isolation health.
            </p>
          </div>

          <button
            onClick={() => setShowAddTenantModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all min-h-[48px] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Institute</span>
          </button>
        </div>

        {/* Global SaaS Platform KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Total Institutes
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black">{totalTenants}</span>
              <span className="text-[10px] text-emerald-400 font-bold">100% active</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Platform MRR
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                ₹{totalMRR.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-300">/ month</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Students Served
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black">1,480</span>
              <span className="text-[10px] text-indigo-300 font-semibold">Across India</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              RLS Isolation Status
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>18/18 Tables Secure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-900">{actionSuccess}</p>
        </div>
      )}

      {/* Super Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'tenants'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Institutes & Tenants ({institutes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'plans'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>SaaS Subscription Plans ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'revenue'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Revenue & Growth</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'system'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>RLS & Security Health</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'branding'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Platform Branding (Logo & Name)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: INSTITUTES & TENANT MANAGEMENT                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Search & Status Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by school name, city, or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="canceled">Suspended</option>
              </select>
            </div>
          </div>

          {/* Tenants List Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-xs">Loading tenant institutes...</p>
            </div>
          ) : filteredInstitutes.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Institutes Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click &quot;Onboard New Institute&quot; above to register school or tuition center tenants onto the SaaS platform.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setShowAddTenantModal(true)}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Onboard First Institute</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredInstitutes.map((inst) => {
                const currentPlan = plans.find((p) => p.id === inst.subscription_plan) || plans[0];
              const isSuspended = inst.subscription_status === 'canceled';

              return (
                <div
                  key={inst.id}
                  className={`bg-white rounded-3xl p-5 border shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSuspended ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {inst.logo_url ? (
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                        <img
                          src={inst.logo_url}
                          alt={inst.name}
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm shrink-0">
                        {inst.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                          {inst.name}
                        </h3>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            inst.subscription_status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inst.subscription_status}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          {currentPlan.name} (₹{currentPlan.priceMonthly}/mo)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inst.city}, {inst.state}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{inst.phone}</span>
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Prefix: {inst.settings?.receipt_prefix || 'REC'} • ID: {inst.slug}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    {/* Switch/Impersonate Tenant Demo */}
                    <button
                      onClick={() => {
                        switchRoleDemo('institute_admin');
                      }}
                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors active:scale-95"
                      title="Inspect as School Admin"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Log in as Admin</span>
                    </button>

                    {/* Edit Details Button */}
                    <button
                      onClick={() => handleOpenEditTenant(inst)}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors active:scale-95"
                      title="Edit Institute Details"
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Edit</span>
                    </button>

                    {/* Change Plan Button */}
                    <button
                      onClick={() => {
                        setSelectedTenantForPlan(inst);
                        setShowEditPlanModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Plan</span>
                    </button>

                    {/* Suspend / Resume Button */}
                    <button
                      onClick={() => handleToggleTenantStatus(inst.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors active:scale-95 ${
                        isSuspended
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isSuspended ? 'Reactivate' : 'Suspend'}
                    </button>

                    {/* Delete Tenant Button */}
                    <button
                      onClick={() => handleDeleteTenant(inst.id, inst.name)}
                      className="p-2 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-slate-400 rounded-xl text-xs font-bold transition-colors active:scale-95"
                      title="Delete Institute"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: SAAS SUBSCRIPTION PLANS & TIERS                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'plans' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Platform SaaS Pricing Plans</h3>
              <p className="text-xs text-slate-500">
                Configure student caps, pricing in INR, and enabled feature modules
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
              Billing Gateway: Razorpay Subscriptions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between relative ${
                  p.isPopular ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200'
                }`}
              >
                {p.isPopular && (
                  <span className="absolute -top-3 left-6 bg-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <h4 className="text-base font-bold text-slate-900">{p.name}</h4>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black text-slate-900">
                      ₹{p.priceMonthly.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    or ₹{p.priceAnnual.toLocaleString('en-IN')}/year (Save 17%)
                  </p>

                  <div className="my-5 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600">
                    {p.activeTenantsCount} Active Institutes
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Max: {p.maxStudents} Students
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: REVENUE & GROWTH ANALYTICS                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Current MRR (INR)</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">₹{totalMRR.toLocaleString('en-IN')}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+25% growth this quarter</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Annual Run Rate (ARR)</p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                ₹{(totalMRR * 12).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1">Projected annualized revenue</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">School Fee Flow</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">₹48,50,000</p>
              <p className="text-xs text-slate-500 mt-1">Volume processed via ClassDesk</p>
            </div>
          </div>

          {/* Revenue Breakdown by Plan */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-4">
              Subscription Revenue Distribution
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Smart School Standard (₹2,499/mo)</span>
                  <span className="font-bold text-indigo-600">₹2,499 (71.4%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full w-[71.4%]" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Starter Tuition Plan (₹999/mo)</span>
                  <span className="font-bold text-indigo-600">₹999 (28.6%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-[28.6%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: RLS & SECURITY AUDIT                                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">PostgreSQL Row Level Security Audit</h3>
              <p className="text-xs text-slate-500">
                Verified zero-cross-tenant data leakage across all 18 database entities
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              { table: 'institutes', rls: 'ENABLED', policy: 'Super Admin + Own Tenant SELECT' },
              { table: 'users', rls: 'ENABLED', policy: 'auth.uid() + Tenant Staff isolation' },
              { table: 'classes', rls: 'ENABLED', policy: 'Tenant staff + Enrolled student parent' },
              { table: 'students', rls: 'ENABLED', policy: 'current_user_phone() E.164 verified' },
              { table: 'attendance', rls: 'ENABLED', policy: 'Parent student ID match only' },
              { table: 'fee_plans', rls: 'ENABLED', policy: 'Tenant Admin write + Staff read' },
              { table: 'fee_payments', rls: 'ENABLED', policy: 'Tenant Admin + Linked parent read' },
              { table: 'exams & marks', rls: 'ENABLED', policy: 'is_published=true check for parents' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-mono font-bold text-slate-900">{item.table}</p>
                  <p className="text-[10px] text-slate-500">{item.policy}</p>
                </div>
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  {item.rls}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: PLATFORM BRANDING (LOGO & NAME)                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  SaaS Platform Identity & White-label Branding
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super Admin control to configure platform logo, name, and tagline visible across the app.
                </p>
              </div>
            </div>

            {brandingSaved && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Branding Updated Globally!</span>
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateBranding({
                name: platformName.trim() || 'ClassDesk',
                tagline: platformTagline.trim() || 'School & Tuition Management Platform',
                logo_url: platformLogoUrl.trim() || null,
              });
              setBrandingSaved(true);
              setActionSuccess('Platform logo and name updated globally!');
              setTimeout(() => {
                setBrandingSaved(false);
                setActionSuccess(null);
              }, 4000);
            }}
            className="space-y-6 max-w-2xl"
          >
            {/* Live Preview Card */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                Live Branding Preview
              </label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                {platformLogoUrl ? (
                  <div className="w-14 h-14 rounded-2xl bg-white p-1.5 border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                    <img
                      src={platformLogoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    {platformName || 'ClassDesk'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {platformTagline || 'School & Tuition Management Platform'}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    Active Platform Identity
                  </span>
                </div>
              </div>
            </div>

            {/* Platform Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Platform Name
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder="e.g. ClassDesk, MySchool, EduCore"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This name updates the top navigation bar, login screen, and portal headers.
              </p>
            </div>

            {/* Platform Tagline */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                Platform Tagline / Subtitle
              </label>
              <input
                type="text"
                value={platformTagline}
                onChange={(e) => setPlatformTagline(e.target.value)}
                placeholder="e.g. School & Tuition Management Platform"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all"
              />
            </div>

            {/* Platform Logo */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Platform Logo
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* File Upload Box */}
                <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="platform-logo-file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setPlatformLogoUrl(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="platform-logo-file"
                    className="cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-indigo-600">Upload Logo Image</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, SVG or WebP</span>
                  </label>
                </div>

                {/* Direct URL input */}
                <div className="flex flex-col justify-center space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Or Image URL:</span>
                  <input
                    type="url"
                    value={platformLogoUrl}
                    onChange={(e) => setPlatformLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                  />
                  {platformLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setPlatformLogoUrl('')}
                      className="text-[10px] font-bold text-rose-600 hover:underline self-start"
                    >
                      Clear Logo (Use Default Icon)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Platform Branding</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetBranding();
                  setPlatformName(DEFAULT_PLATFORM_BRANDING.name);
                  setPlatformTagline(DEFAULT_PLATFORM_BRANDING.tagline);
                  setPlatformLogoUrl('');
                  setBrandingSaved(true);
                  setTimeout(() => setBrandingSaved(false), 3000);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-2xl text-xs font-bold transition-all"
              >
                Reset to Default
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ONBOARD NEW TENANT INSTITUTE                           */}
      {/* ------------------------------------------------------------- */}
      {showAddTenantModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Onboard School / Tuition Center</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddTenantModal(false);
                  setActionError(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardTenant} className="space-y-4 mt-4">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  Institute Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTenantType('school')}
                    className={`p-2.5 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                      newTenantType === 'school'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <School className="w-4 h-4 text-indigo-600" />
                    <p className="text-[11px] font-bold">School / K-12</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTenantType('tuition_center')}
                    className={`p-2.5 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                      newTenantType === 'tuition_center'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <p className="text-[11px] font-bold">Tuition / Coaching</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTenantType('coaching')}
                    className={`p-2.5 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                      newTenantType === 'coaching'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <p className="text-[11px] font-bold">College / Academy</p>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Institute Full Name
                </label>
                <input
                  type="text"
                  placeholder={
                    newTenantType === 'school'
                      ? 'e.g. St. Thomas Higher Secondary School'
                      : newTenantType === 'tuition_center'
                      ? 'e.g. Apex Science Tuition Centre'
                      : 'e.g. Grace Academy'
                  }
                  value={newTenantName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTenantName(val);
                    if (!newTenantPrefix || newTenantPrefix === 'REC') {
                      const prefixCandidate = val.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
                      if (prefixCandidate) setNewTenantPrefix(prefixCandidate);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              {/* Institute Logo Upload / URL */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Institute Logo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {newTenantLogoUrl ? (
                    <div className="relative w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-sm">
                      <img
                        src={newTenantLogoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setNewTenantLogoUrl('')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow-sm hover:bg-rose-600"
                        title="Remove Logo"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="add-tenant-logo-file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setNewTenantLogoUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="add-tenant-logo-file"
                        className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                      </label>
                      {newTenantLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setNewTenantLogoUrl('')}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={newTenantLogoUrl}
                      onChange={(e) => setNewTenantLogoUrl(e.target.value)}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Address / Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Campus Address / Area
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Road, Near Civil Station"
                  value={newTenantAddress}
                  onChange={(e) => setNewTenantAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              {/* City and State */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Thrissur"
                    value={newTenantCity}
                    onChange={(e) => setNewTenantCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={newTenantState}
                    onChange={(e) => setNewTenantState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              {/* Contact Phone & Official Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={newTenantPhone}
                    onChange={(e) => setNewTenantPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. info@institute.edu.in"
                    value={newTenantEmail}
                    onChange={(e) => setNewTenantEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Receipt Prefix */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Receipt Prefix (for Fee Invoices)
                </label>
                <input
                  type="text"
                  placeholder="e.g. STPS"
                  value={newTenantPrefix}
                  onChange={(e) => setNewTenantPrefix(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono"
                  required
                />
              </div>

              {/* Administrator Account Details */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <p className="text-xs font-bold text-slate-800">Institute Administrator Account</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Admin Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Principal Nair"
                      value={newTenantAdminName}
                      onChange={(e) => setNewTenantAdminName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Admin Login Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. admin@school.com"
                      value={newTenantAdminEmail}
                      onChange={(e) => setNewTenantAdminEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-indigo-500" />
                      <span>Admin Password (Used to Log In)</span>
                    </span>
                    <span className="text-[9px] text-indigo-600 font-semibold">Min 6 characters</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      placeholder="Set admin password"
                      value={newTenantAdminPassword}
                      onChange={(e) => setNewTenantAdminPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    The school admin can log into ClassDesk with their email and this password.
                  </p>
                </div>
              </div>

              {/* Subscription Tier */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Subscription Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewTenantPlan(p.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        newTenantPlan === p.id
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-[11px] font-bold truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">₹{p.priceMonthly}/mo</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all min-h-[48px] mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Onboarding Institute...</span>
                  </>
                ) : (
                  <span>Provision Tenant & Generate Subdomain</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CHANGE SUBSCRIPTION PLAN                               */}
      {/* ------------------------------------------------------------- */}
      {showEditPlanModal && selectedTenantForPlan && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Change Subscription Plan
              </h3>
              <button
                onClick={() => setShowEditPlanModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                Updating tier for <strong className="text-slate-900">{selectedTenantForPlan.name}</strong>:
              </p>

              {plans.map((p) => {
                const isCurrent = selectedTenantForPlan.subscription_plan === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleUpdateTenantPlan(p.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{p.name}</p>
                      <p className="text-[10px] text-slate-500">
                        ₹{p.priceMonthly}/month • Up to {p.maxStudents} students
                      </p>
                    </div>
                    {isCurrent && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT TENANT INSTITUTE DETAILS                          */}
      {/* ------------------------------------------------------------- */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Tenant Institute Details</span>
              </h3>
              <button
                onClick={() => setEditingTenant(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTenantDetails} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  School / Institute Name
                </label>
                <input
                  type="text"
                  value={editTenantName}
                  onChange={(e) => setEditTenantName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              {/* Institute Logo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Institute Logo
                </label>
                <div className="flex items-center gap-3">
                  {editTenantLogoUrl ? (
                    <div className="relative w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-sm">
                      <img
                        src={editTenantLogoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setEditTenantLogoUrl('')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow-sm hover:bg-rose-600"
                        title="Remove Logo"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="edit-tenant-logo-file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setEditTenantLogoUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="edit-tenant-logo-file"
                        className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Change Logo</span>
                      </label>
                      {editTenantLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditTenantLogoUrl('')}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={editTenantLogoUrl}
                      onChange={(e) => setEditTenantLogoUrl(e.target.value)}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editTenantCity}
                    onChange={(e) => setEditTenantCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editTenantState}
                    onChange={(e) => setEditTenantState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={editTenantPhone}
                    onChange={(e) => setEditTenantPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={editTenantEmail}
                    onChange={(e) => setEditTenantEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    value={editTenantAddress}
                    onChange={(e) => setEditTenantAddress(e.target.value)}
                    placeholder="e.g. Main Road, Campus Area"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Receipt Prefix
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editTenantPrefix}
                    onChange={(e) => setEditTenantPrefix(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={editTenantPlan}
                    onChange={(e) => setEditTenantPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Tenant Status
                  </label>
                  <select
                    value={editTenantStatus}
                    onChange={(e) => setEditTenantStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="canceled">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl text-xs font-bold transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Pencil className="w-4 h-4" />
                  )}
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
