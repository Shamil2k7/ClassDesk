'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ShieldAlert,
} from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslation();

  if (pathname === '/login') {
    return null;
  }

  const role = user?.role || 'parent';

  // Define role-specific navigation tabs (Mobile Thumb Zone ergonomics)
  const getNavItems = () => {
    switch (role) {
      case 'super_admin':
        return [
          { href: '/super-admin', label: 'SaaS Admin', icon: ShieldAlert },
          { href: '/institutes', label: 'Institutes', icon: Building2 },
          { href: '/settings', label: t('nav.settings', 'Settings'), icon: Settings },
        ];
      case 'institute_admin':
        return [
          { href: '/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { href: '/fees', label: t('nav.fees', 'Fees'), icon: CreditCard },
          { href: '/classes', label: t('nav.classes', 'Classes'), icon: Users },
          { href: '/exams', label: t('nav.exams', 'Exams'), icon: Award },
        ];
      case 'teacher':
        return [
          { href: '/dashboard', label: t('nav.dashboard', 'Today'), icon: LayoutDashboard },
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { href: '/timetable', label: t('nav.timetable', 'Schedule'), icon: Clock },
          { href: '/notes', label: t('nav.notes', 'Notes'), icon: BookOpen },
          { href: '/announcements', label: t('nav.announcements', 'Notices'), icon: FileText },
        ];
      case 'parent':
      default:
        return [
          { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { href: '/fees', label: t('nav.fees', 'Fees'), icon: CreditCard },
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { href: '/notes', label: t('nav.notes', 'Notes'), icon: BookOpen },
          { href: '/exams', label: t('nav.exams', 'Exams'), icon: Award },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe sm:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-manipulation transition-all active:scale-95 ${
                isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] leading-tight tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
