'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation, Locale } from '@/lib/i18n/context';
import { usePlatformBranding } from '@/lib/platform-config';
import { ChildSwitcher } from './child-switcher';
import {
  Bell,
  Globe,
  GraduationCap,
  Smartphone,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  ChevronRight,
  ShieldAlert,
  Users,
  BookOpen,
  FileText,
  Clock,
  Award,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { NotificationItem } from '@/types/app.types';
import { createClient } from '@/lib/supabase/client';

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, institute, logout } = useAuth();
  const { branding } = usePlatformBranding();
  const { locale, setLocale, t } = useTranslation();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const supabase = createClient();

  const role = user?.role || 'parent';

  // Listen to open-mobile-drawer custom event (triggered from BottomNav More tab)
  useEffect(() => {
    const handleOpenDrawer = () => setMobileNavOpen(true);
    window.addEventListener('open-mobile-drawer', handleOpenDrawer);
    return () => window.removeEventListener('open-mobile-drawer', handleOpenDrawer);
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileNavOpen(false);
    setShowProfileMenu(false);
    setShowLangMenu(false);
    setShowNotifMenu(false);
  }, [pathname]);

  // Load notifications
  useEffect(() => {
    async function loadNotifs() {
      try {
        let query = supabase.from('notifications').select('*');
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
    if (user?.id) {
      loadNotifs();
    }
  }, [supabase, user?.id]);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    setMobileNavOpen(false);
    await logout();
    router.replace('/login');
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getRoleBadge = (r?: string) => {
    switch (r) {
      case 'super_admin':
        return { label: 'Super Administrator', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'institute_admin':
        return { label: 'School Admin', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'teacher':
        return { label: 'Teacher / Faculty', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'parent':
        return { label: 'Parent / Guardian', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      default:
        return { label: 'Member', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleBadge = getRoleBadge(user?.role);

  // Full role-specific navigation items for the mobile drawer
  const getNavItems = () => {
    switch (role) {
      case 'super_admin':
        return [
          { href: '/super-admin', label: 'SaaS Command Center', icon: ShieldAlert, highlight: true },
          { href: '/institutes', label: 'Tenant Institutes', icon: Building2 },
          { href: '/settings', label: t('nav.settings', 'Platform Settings'), icon: Settings },
        ];
      case 'institute_admin':
        return [
          { href: '/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
          { href: '/classes', label: t('nav.classes', 'Classes & Batches'), icon: Users },
          { href: '/teachers', label: t('nav.teachers', 'Teachers & Faculty'), icon: Users },
          { href: '/students', label: t('nav.students', 'Student Records'), icon: Users },
          { href: '/attendance', label: t('nav.attendance', 'Daily Attendance'), icon: CalendarCheck },
          { href: '/fees', label: t('nav.fees', 'Fees & Payments'), icon: CreditCard },
          { href: '/timetable', label: t('nav.timetable', 'Weekly Timetable'), icon: Clock },
          { href: '/notes', label: t('nav.notes', 'Notes & Materials'), icon: BookOpen },
          { href: '/announcements', label: t('nav.announcements', 'Announcements & Circulars'), icon: FileText },
          { href: '/exams', label: t('nav.exams', 'Exams & Marks'), icon: Award },
          { href: '/settings', label: t('nav.settings', 'Settings & Profile'), icon: Settings },
        ];
      case 'teacher':
        return [
          { href: '/dashboard', label: t('nav.dashboard', 'Today Schedule'), icon: LayoutDashboard },
          { href: '/attendance', label: t('nav.attendance', 'Mark Attendance'), icon: CalendarCheck },
          { href: '/timetable', label: t('nav.timetable', 'My Timetable'), icon: Clock },
          { href: '/notes', label: t('nav.notes', 'Study Materials'), icon: BookOpen },
          { href: '/announcements', label: t('nav.announcements', 'Announcements'), icon: FileText },
          { href: '/exams', label: t('nav.exams', 'Exams & Marks Entry'), icon: Award },
          { href: '/settings', label: t('nav.settings', 'Settings & Profile'), icon: Settings },
        ];
      case 'parent':
      default:
        return [
          { href: '/dashboard', label: 'Home Dashboard', icon: LayoutDashboard },
          { href: '/fees', label: t('nav.fees', 'Fee Payments & Receipts'), icon: CreditCard },
          { href: '/attendance', label: t('nav.attendance', 'Attendance Records'), icon: CalendarCheck },
          { href: '/timetable', label: t('nav.timetable', 'Class Timetable'), icon: Clock },
          { href: '/notes', label: t('nav.notes', 'Study Materials & Notes'), icon: BookOpen },
          { href: '/exams', label: t('nav.exams', 'Exams & Report Cards'), icon: Award },
          { href: '/announcements', label: t('nav.announcements', 'School Circulars'), icon: FileText },
          { href: '/settings', label: t('nav.settings', 'Settings & Profile'), icon: Settings },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile Menu Toggle Button + Institute Branding */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {pathname !== '/login' && (
              <button
                onClick={() => setMobileNavOpen(true)}
                className="sm:hidden p-2 -ml-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                aria-label="Open Navigation Menu"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link
              href={user?.role === 'super_admin' ? '/super-admin' : '/dashboard'}
              className="flex items-center gap-2 min-w-0 hover:opacity-90 transition-opacity"
            >
              {user?.role === 'super_admin' ? (
                branding.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt={branding.name}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                )
              ) : institute?.logo_url ? (
                <img
                  src={institute.logo_url}
                  alt={institute.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0"
                />
              ) : branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
                  {user?.role === 'super_admin'
                    ? `${branding.name} Super Portal`
                    : institute?.name || branding.name}
                </h1>
                <p className="text-[10px] text-slate-500 truncate hidden xs:block">
                  {user?.role === 'super_admin'
                    ? 'Platform Administrator'
                    : institute?.city
                    ? `${institute.city}, ${institute.state || 'India'}`
                    : branding.tagline}
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Switchers, Notifications & Profile Avatar */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {pathname !== '/login' && (
              <>
                {/* Child Switcher (Only renders when role is parent) */}
                <ChildSwitcher />

                {/* Install App Link */}
                <Link
                  href="/install"
                  className="hidden md:flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                  title="Install Mobile App"
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Install App</span>
                </Link>
              </>
            )}

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                title="Change Language"
                aria-label="Change Language"
              >
                <Globe className="w-4 h-4" />
              </button>

              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-1 animate-in fade-in zoom-in-95 duration-100">
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
                    <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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

            {/* User Profile Avatar & Dropdown Button */}
            {pathname !== '/login' && user && (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  aria-label="My Profile & Account"
                  title="My Profile & Account"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0 border border-indigo-200">
                    {user.full_name?.slice(0, 1).toUpperCase() || 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Profile Dropdown Modal */}
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute right-0 mt-2 w-72 max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                      {/* User Info Header */}
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                          {user.full_name?.slice(0, 1).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {user.full_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {user.phone || user.email || 'ClassDesk User'}
                          </p>
                          <span
                            className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${roleBadge.bg}`}
                          >
                            {roleBadge.label}
                          </span>
                        </div>
                      </div>

                      {/* Institute info */}
                      {institute && user.role !== 'super_admin' && (
                        <div className="px-2 py-1 text-[11px] text-slate-500 bg-indigo-50/50 rounded-lg border border-indigo-100/50 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">{institute.name}</span>
                        </div>
                      )}

                      {/* Menu Quick Links */}
                      <div className="space-y-0.5 pt-1 border-t border-slate-100">
                        <Link
                          href="/settings"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span>My Profile & Settings</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </Link>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setMobileNavOpen(true);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <Menu className="w-4 h-4 text-indigo-600" />
                            <span>Browse All Sections</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>

                      {/* Logout Button */}
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE FULL NAVIGATION DRAWER (Slide-in menu for small screens)          */}
      {/* ========================================================================= */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileNavOpen(false)}
          />

          {/* Drawer container */}
          <div className="fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                {institute?.logo_url ? (
                  <img
                    src={institute.logo_url}
                    alt={institute.name}
                    className="w-8 h-8 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {user?.role === 'super_admin' ? branding.name : institute?.name || branding.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">ClassDesk Portal</p>
                </div>
              </div>

              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-300 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Summary Card */}
            {user && (
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-b border-indigo-100">
                <Link
                  href="/settings"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 p-2 bg-white rounded-2xl shadow-sm border border-indigo-100 hover:border-indigo-300 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {user.full_name?.slice(0, 1).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.phone}</p>
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${roleBadge.bg}`}
                    >
                      {roleBadge.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
                </Link>
              </div>
            )}

            {/* Scrollable Nav Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 px-3 py-1 tracking-wider">
                Menu Navigation
              </p>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                        : 'text-slate-700 hover:bg-slate-50 active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 space-y-2">
              <Link
                href="/install"
                onClick={() => setMobileNavOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 py-2 rounded-xl text-xs font-bold transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Install Mobile App (PWA)</span>
              </Link>

              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Account</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
