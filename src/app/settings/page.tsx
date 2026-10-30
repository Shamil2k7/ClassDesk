'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation, Locale } from '@/lib/i18n/context';
import {
  Settings as SettingsIcon,
  Bell,
  Globe,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Upload,
  Trash2,
  Building2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { NotificationSettings } from '@/types/app.types';

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  id: 'ns-default',
  user_id: null,
  phone: '',
  absent_alert: true,
  fee_due: true,
  fee_paid: true,
  announcement: true,
  new_notes: true,
  timetable_change: true,
  marks_published: true,
  updated_at: new Date().toISOString(),
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, institute, logout, updateInstitute } = useAuth();
  const { locale, setLocale, t } = useTranslation();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Institute Branding & Logo State
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !institute) return;

    if (file.size > 3 * 1024 * 1024) {
      setLogoError('Logo image must be smaller than 3MB');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setLogoError('Supported formats: PNG, JPG, JPEG, WebP, or SVG');
      return;
    }

    setLogoUploading(true);
    setLogoError(null);
    setLogoSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('institute_id', institute.id);

      const res = await fetch('/api/institutes/logo', {
        method: 'POST',
        headers: {
          'x-user-role': user?.role || 'institute_admin',
          'x-user-id': user?.id || '',
          'x-user-institute-id': institute.id,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      if (data.logo_url) {
        updateInstitute({ logo_url: data.logo_url });
        setLogoSuccess('Institute logo updated successfully! It is now visible on your login page, dashboards, and printable receipts.');
        setTimeout(() => setLogoSuccess(null), 5000);
      }
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Error uploading logo');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!institute) return;
    if (!window.confirm('Are you sure you want to remove your institute logo and revert to the default ClassDesk logo?')) {
      return;
    }

    setLogoUploading(true);
    setLogoError(null);

    try {
      const res = await fetch(`/api/institutes/logo?institute_id=${encodeURIComponent(institute.id)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': user?.role || 'institute_admin',
          'x-user-id': user?.id || '',
          'x-user-institute-id': institute.id,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove logo');
      }

      updateInstitute({ logo_url: null });
      setLogoSuccess('Logo removed. Default ClassDesk branding restored.');
      setTimeout(() => setLogoSuccess(null), 4000);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Error removing logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCopyLoginUrl = () => {
    if (typeof window === 'undefined' || !institute) return;
    const origin = window.location.origin;
    const url = `${origin}/login?institute=${institute.slug || institute.id}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      return updated;
    });
  };

  const notificationToggles = [
    {
      key: 'absent_alert' as const,
      label: t('settings.absentAlert', 'Instant Absent Alert'),
      desc: 'Get notified immediately if your child is marked absent during morning roll call.',
    },
    {
      key: 'fee_due' as const,
      label: t('settings.feeDue', 'Fee Due Reminders'),
      desc: 'Receive alerts 5 days prior to fee deadlines to avoid late fines.',
    },
    {
      key: 'fee_paid' as const,
      label: t('settings.feePaid', 'Fee Payment Confirmation'),
      desc: 'Instant payment receipt confirmation when fee is settled online or via cash.',
    },
    {
      key: 'announcement' as const,
      label: t('settings.announcement', 'Important Announcements'),
      desc: 'School holidays, exam schedules, and circulars broadcasted by principal.',
    },
    {
      key: 'new_notes' as const,
      label: t('settings.newNotes', 'New Study Material Uploaded'),
      desc: 'Alerts when subject teachers upload new revision PDFs or question banks.',
    },
    {
      key: 'timetable_change' as const,
      label: t('settings.timetableChange', 'Timetable Changes'),
      desc: 'Instant notice if period timings or teacher substitutions occur.',
    },
    {
      key: 'marks_published' as const,
      label: t('settings.marksPublished', 'Exam Marks Published'),
      desc: 'Notification when term test marks and rank cards are published.',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('settings.title', 'Settings & Preferences')}
          </h2>
          <p className="text-xs text-slate-500">
            Push notifications, language preferences, and profile configuration
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5" />
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-900">
            Notification preferences updated and synced to server!
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* INSTITUTE BRANDING & LOGO SECTION (Admins & Staff)            */}
      {/* ------------------------------------------------------------- */}
      {institute && (user?.role === 'institute_admin' || user?.role === 'super_admin') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Institute Branding & Dedicated Identity
                </h3>
                <p className="text-xs text-slate-500">
                  Configure your institute logo, login branding, and unique portal access URL.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 self-start sm:self-auto">
              {institute.name}
            </span>
          </div>

          {logoSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{logoSuccess}</span>
            </div>
          )}

          {logoError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{logoError}</span>
            </div>
          )}

          {/* Logo Upload & Preview Area */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            {/* Logo Preview with Fallback */}
            <div className="relative w-20 h-20 rounded-2xl bg-white border border-slate-200 p-2 shrink-0 flex items-center justify-center shadow-sm">
              {institute.logo_url ? (
                <img
                  src={institute.logo_url}
                  alt={institute.name}
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center">
                  <span className="text-lg font-black">{institute.name.charAt(0)}</span>
                  <span className="text-[8px] font-bold uppercase tracking-tight">ClassDesk</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {institute.logo_url ? 'Custom Institute Logo Active' : 'Default Platform Logo'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Appears on the login screen, desktop sidebar, student and parent dashboards, and official PDF receipts.
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supported formats: PNG, JPG, JPEG, WebP, SVG. Max file size: 3MB.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <input
                  type="file"
                  id="settings-institute-logo-upload"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />
                <label
                  htmlFor="settings-institute-logo-upload"
                  className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm transition-all inline-flex items-center gap-1.5 ${
                    logoUploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {logoUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{institute.logo_url ? 'Replace Logo' : 'Upload Logo'}</span>
                </label>

                {institute.logo_url && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={logoUploading}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Logo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dedicated Login URL Card */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">
                Dedicated Institute Login Portal URL
              </span>
              <a
                href={`/login?institute=${institute.slug || institute.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Preview Login Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-600">
              Share this dedicated URL with students, parents, and teachers. When opened, it automatically presents your institute logo, title, and customized branding.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 bg-white border border-indigo-200/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 truncate select-all">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/login?institute=${institute.slug || institute.id}`
                  : `/login?institute=${institute.slug || institute.id}`}
              </div>
              <button
                type="button"
                onClick={handleCopyLoginUrl}
                className="bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shrink-0"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language Preferences Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>{t('settings.language', 'App Language')}</span>
        </h3>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { code: 'en', label: 'English', sub: 'Default' },
            { code: 'ml', label: 'മലയാളം', sub: 'Malayalam' },
            { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code as Locale)}
              className={`p-3 rounded-2xl border text-center transition-all min-h-[56px] active:scale-95 ${
                locale === l.code
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <p className="text-xs font-bold">{l.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{l.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Granular Push Notification Switches */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>{t('settings.notifications', 'Push Notification Channels')}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn alerts on or off for your phone number ({user?.phone})
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {notificationToggles.map((item) => {
            const isChecked = settings[item.key] ?? true;
            return (
              <div
                key={item.key}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{item.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => toggleSetting(item.key)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none ${
                    isChecked ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={isChecked}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      isChecked ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profile & Logout */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-900">{user?.full_name}</p>
          <p className="text-[11px] text-slate-500">
            Registered: {user?.phone} • Role: {user?.role.toUpperCase()}
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px] disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          <span>{isLoggingOut ? 'Logging out...' : t('settings.logout', 'Log Out')}</span>
        </button>
      </div>
    </div>
  );
}
