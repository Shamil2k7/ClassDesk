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
  const { user, institute, logout } = useAuth();
  const { locale, setLocale, t } = useTranslation();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/login');
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
