'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Building2,
  Plus,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  X,
  Loader2,
  Pencil,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Institute } from '@/types/app.types';
import { SchemaNotice } from '@/components/common/schema-notice';
import {
  getLocalData,
  saveLocalData,
  appendLocalData,
  syncLocalWithRemote,
  updateLocalData,
  removeLocalData,
} from '@/lib/storage-helper';

export default function InstitutesPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [plan, setPlan] = useState('standard');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Edit Institute Form State
  const [editingInst, setEditingInst] = useState<Institute | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPlan, setEditPlan] = useState('standard');
  const [editStatus, setEditStatus] = useState<string>('active');

  const loadInstitutes = useCallback(async () => {
    try {
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

  useEffect(() => {
    const local = getLocalData<Institute>('institutes');
    if (local.length > 0) setInstitutes(local);
    loadInstitutes();
  }, [loadInstitutes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const cleanPhone = phone.replace(/\s+/g, '');
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `institute-${Date.now()}`;

    const finalAdminEmail = adminEmail.trim() || `admin@${slug}.classdesk.app`;
    const finalAdminPassword = adminPassword.trim() || 'admin123';
    const finalAdminName = adminName.trim() || `${name.trim()} Administrator`;

    const fallbackInst: Institute = {
      id: `inst-${Date.now()}`,
      name: name.trim(),
      slug,
      logo_url: logoUrl.trim() || null,
      phone: cleanPhone,
      email: finalAdminEmail,
      address: null,
      city,
      state: 'Kerala',
      pincode: null,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      subscription_plan: plan,
      subscription_status: 'active' as const,
      settings: {
        receipt_prefix: name.trim().slice(0, 4).toUpperCase(),
        late_fee_enabled: false,
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
          name: name.trim(),
          logo_url: logoUrl.trim() || null,
          city,
          phone: cleanPhone,
          subscription_plan: plan,
          admin_name: finalAdminName,
          admin_email: finalAdminEmail,
          admin_password: finalAdminPassword,
        }),
      });

      const resData = await res.json();
      const createdInst: Institute = res.ok && resData.institute ? resData.institute : fallbackInst;
      setInstitutes(appendLocalData('institutes', createdInst));

      const adminInfo = resData.admin || {
        email: finalAdminEmail,
        password: finalAdminPassword,
        institute_id: createdInst.id,
        full_name: finalAdminName,
        role: 'institute_admin',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingAdmins = getLocalData<any>('admins');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      saveLocalData('admins', [adminInfo, ...existingAdmins.filter((a: any) => a.email !== adminInfo.email)]);

      setActionSuccess(
        `"${name}" onboarded successfully! Admin Login: ${adminInfo.email} | Password: ${adminInfo.password || finalAdminPassword}`
      );
      setTimeout(() => setActionSuccess(null), 10000);

      setShowAddModal(false);
      setName('');
      setLogoUrl('');
      setCity('');
      setPhone('+91 ');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('admin123');
    } catch {
      setInstitutes(appendLocalData('institutes', fallbackInst));
      setShowAddModal(false);
      setName('');
      setLogoUrl('');
      setCity('');
      setPhone('+91 ');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('admin123');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (inst: Institute) => {
    setEditingInst(inst);
    setEditName(inst.name);
    setEditLogoUrl(inst.logo_url || '');
    setEditCity(inst.city || '');
    setEditState(inst.state || 'Kerala');
    setEditPhone(inst.phone || '');
    setEditEmail(inst.email || '');
    setEditAddress(inst.address || '');
    setEditPlan(inst.subscription_plan || 'standard');
    setEditStatus(inst.subscription_status || 'active');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInst) return;

    setIsSubmitting(true);
    const cleanPhone = editPhone.replace(/\s+/g, '');

    const updates = {
      name: editName,
      logo_url: editLogoUrl.trim() || null,
      city: editCity,
      state: editState,
      phone: cleanPhone,
      email: editEmail || null,
      address: editAddress || null,
      subscription_plan: editPlan,
      subscription_status: editStatus,
    };

    try {
      const res = await fetch('/api/institutes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingInst.id,
          ...updates,
        }),
      });

      if (!res.ok) {
        // Fallback to direct supabase client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('institutes')
          .update(updates)
          .eq('id', editingInst.id);
      }
    } catch (err) {
      console.warn('Update remote institute error:', err);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('institutes')
          .update(updates)
          .eq('id', editingInst.id);
      } catch {}
    }

    setInstitutes(updateLocalData<Institute>('institutes', editingInst.id, updates));
    setEditingInst(null);
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string, instName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${instName}"? This will delete all tenant data and cannot be undone.`)) {
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
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SchemaNotice visible={schemaMissing} />

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-900">Success</p>
            <p className="text-xs text-emerald-700 mt-0.5 font-medium">{actionSuccess}</p>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-500 hover:text-emerald-700 text-xs font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Tenant Institutes & Schools
          </h2>
          <p className="text-xs text-slate-500">
            Multi-tenant institute directories, subscription plans, and status
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Institute</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs">Loading institutes...</p>
        </div>
      ) : institutes.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Institutes Onboarded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add your first school or tuition center tenant to configure classes, batches, and academic faculty.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard First Institute</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {institutes.map((inst) => (
            <div
              key={inst.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {inst.subscription_status?.toUpperCase() || 'ACTIVE'} • {inst.subscription_plan?.toUpperCase() || 'STANDARD'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400">ID: {inst.slug || inst.id}</span>
                    <button
                      onClick={() => handleOpenEdit(inst)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-1"
                      title="Edit Institute"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(inst.id, inst.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Institute"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-3">
                  {inst.logo_url ? (
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img
                        src={inst.logo_url}
                        alt={inst.name}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs shrink-0">
                      {inst.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {inst.city || 'India'}, {inst.state || ''}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{inst.phone || 'No phone set'}</span>
                  </div>
                  {inst.email && (
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{inst.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Onboard New Institute</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  School / Institute Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Modern Tuition Centre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              {/* Institute Logo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Institute Logo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="relative w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-sm">
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
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
                        id="inst-add-logo-file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setLogoUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="inst-add-logo-file"
                        className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
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
                    placeholder="e.g. Kozhikode"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Subscription Plan
                </label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="basic">Basic (Up to 150 students)</option>
                  <option value="standard">Standard (Up to 500 students)</option>
                  <option value="pro">Pro (Unlimited)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Admin Credentials (For Portal Login)
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Admin Full Name
                    </label>
                    <input
                      type="text"
                      placeholder={name ? `${name} Admin` : 'Institute Admin'}
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Admin Email (Login ID)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. admin@school.classdesk.app"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Admin Password
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-9 py-2 text-xs font-bold text-slate-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all min-h-[48px] flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{isSubmitting ? 'Onboarding...' : 'Onboard Institute'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Institute */}
      {editingInst && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <span>Edit Institute Details</span>
              </h3>
              <button
                onClick={() => setEditingInst(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  School / Institute Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Modern Tuition Centre"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  {editLogoUrl ? (
                    <div className="relative w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-sm">
                      <img
                        src={editLogoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setEditLogoUrl('')}
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
                        id="inst-edit-logo-file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setEditLogoUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="inst-edit-logo-file"
                        className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Change Logo</span>
                      </label>
                      {editLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditLogoUrl('')}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
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
                    placeholder="e.g. Kozhikode"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
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
                    placeholder="e.g. Kerala"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
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
                    placeholder="info@school.edu.in"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  placeholder="Main Road, Campus Area"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="basic">Basic (Up to 150 students)</option>
                    <option value="standard">Standard (Up to 500 students)</option>
                    <option value="pro">Pro (Unlimited)</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
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
                  onClick={() => setEditingInst(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl text-xs font-bold transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98] text-white py-3.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
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
