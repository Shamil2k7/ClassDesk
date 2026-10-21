'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  BookOpen,
  FileText,
  Clock,
  Award,
  Settings,
  Building2,
  Users,
  LogOut,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
  };

  if (pathname === '/login') {
    return null;
  }

  const role = user?.role || 'parent';

  const menuItems = [
    ...(role === 'super_admin'
      ? [
          { href: '/super-admin', label: 'SaaS Command Center', icon: ShieldAlert, highlight: true },
          { href: '/institutes', label: 'Tenant Institutes', icon: Building2 },
          { href: '/settings', label: t('nav.settings', 'Settings'), icon: Settings },
        ]
      : [
          { href: '/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
        ]),
    ...(role === 'institute_admin'
      ? [
          { href: '/classes', label: t('nav.classes', 'Classes & Batches'), icon: Users },
          { href: '/teachers', label: t('nav.teachers', 'Teachers'), icon: Users },
          { href: '/students', label: t('nav.students', 'Students'), icon: Users },
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { href: '/fees', label: t('nav.fees', 'Fees & Payments'), icon: CreditCard },
          { href: '/timetable', label: t('nav.timetable', 'Timetable'), icon: Clock },
          { href: '/notes', label: t('nav.notes', 'Notes & Materials'), icon: BookOpen },
          { href: '/announcements', label: t('nav.announcements', 'Announcements'), icon: FileText },
          { href: '/exams', label: t('nav.exams', 'Exams & Marks'), icon: Award },
          { href: '/settings', label: t('nav.settings', 'Settings'), icon: Settings },
        ]
      : []),
    ...(role === 'teacher'
      ? [
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { href: '/timetable', label: t('nav.timetable', 'Schedule'), icon: Clock },
          { href: '/notes', label: t('nav.notes', 'Notes & Materials'), icon: BookOpen },
          { href: '/announcements', label: t('nav.announcements', 'Announcements'), icon: FileText },
          { href: '/exams', label: t('nav.exams', 'Exams & Marks'), icon: Award },
          { href: '/settings', label: t('nav.settings', 'Settings'), icon: Settings },
        ]
      : []),
    ...(role === 'parent'
      ? [
          { href: '/fees', label: t('nav.fees', 'Fees & Receipts'), icon: CreditCard },
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { href: '/notes', label: t('nav.notes', 'Notes & Materials'), icon: BookOpen },
          { href: '/exams', label: t('nav.exams', 'Exams & Report Cards'), icon: Award },
          { href: '/timetable', label: t('nav.timetable', 'Schedule'), icon: Clock },
          { href: '/announcements', label: t('nav.announcements', 'Announcements'), icon: FileText },
          { href: '/settings', label: t('nav.settings', 'Settings'), icon: Settings },
        ]
      : []),
  ];

  return (
    <aside className="hidden sm:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-57px)] p-4 shrink-0">
      <div className="space-y-1 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? item.highlight
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                    : 'bg-indigo-50 text-indigo-700'
                  : item.highlight
                  ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive
                    ? item.highlight
                      ? 'text-white'
                      : 'text-indigo-600'
                    : item.highlight
                    ? 'text-purple-600'
                    : 'text-slate-500'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-100 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {user?.full_name?.slice(0, 1) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.phone}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('settings.logout', 'Log Out')}</span>
        </button>
      </div>
    </aside>
  );
}
