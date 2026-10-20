'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation, Locale } from '@/lib/i18n/context';
import { usePlatformBranding } from '@/lib/platform-config';
import { ChildSwitcher } from './child-switcher';
import { Bell, Globe, GraduationCap, Smartphone } from 'lucide-react';
import { NotificationItem } from '@/types/app.types';
import { createClient } from '@/lib/supabase/client';

export function TopBar() {
  const pathname = usePathname();
  const { user, institute } = useAuth();
  const { branding } = usePlatformBranding();
  const { locale, setLocale } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const supabase = createClient();

  React.useEffect(() => {
    async function loadNotifs() {
      try {
        let query = supabase
          .from('notifications')
          .select('*');
        if (user?.id) {
          query = query.eq('user_id', user.id);
        }
        const { data } = await query
          .order('created_at', { ascending: false })
          .limit(10);
        if (data) setNotifications(data as NotificationItem[]);
      } catch {
        // quiet fallback
      }
    }
    loadNotifs();
  }, [supabase, user?.id]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Branding & Institute Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          {user?.role === 'super_admin' ? (
            branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding.name}
                className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
            )
          ) : institute?.logo_url ? (
            <img
              src={institute.logo_url}
              alt={institute.name}
              className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0"
            />
          ) : branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.name}
              className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
              {user?.role === 'super_admin'
                ? `${branding.name} Super Portal`
                : institute?.name || branding.name}
            </h1>
            <p className="text-[10px] text-slate-500 truncate">
              {user?.role === 'super_admin'
                ? 'Platform Administrator'
                : institute?.city ? `${institute.city}, ${institute.state || 'India'}` : branding.tagline}
            </p>
          </div>
        </div>

        {/* Center / Right: Switchers & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {pathname !== '/login' && (
            <>
              {/* Child Switcher (Only renders when role is parent) */}
              <ChildSwitcher />

              {/* Install App Link */}
              <Link
                href="/install"
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-2 sm:px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                title="Install Mobile App"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Install App</span>
              </Link>
            </>
          )}

          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
              title="Change Language"
            >
              <Globe className="w-4 h-4" />
            </button>

            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-1">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'ml', label: 'മലയാളം' },
                    { code: 'hi', label: 'हिन्दी' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLocale(l.code as Locale);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium ${
                        locale === l.code
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notification Bell */}
          {pathname !== '/login' && (
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {showNotifMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Notifications</span>
                      <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                          <p className="text-xs font-medium text-slate-600">No notifications</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">You're completely caught up!</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 text-left ${notif.is_read ? 'bg-white' : 'bg-indigo-50/50'}`}
                          >
                            <p className="text-xs font-semibold text-slate-900">{notif.title}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                              {notif.body}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-1">
                              {new Date(notif.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
