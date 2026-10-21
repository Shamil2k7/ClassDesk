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
  Menu,
  Video,
} from 'lucide-react';

interface BottomNavItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isMenuTrigger?: boolean;
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslation();

  if (pathname === '/login') {
    return null;
  }

  const role = user?.role || 'parent';

  // Define role-specific navigation tabs (Mobile Thumb Zone ergonomics)
  const getNavItems = (): BottomNavItem[] => {
    switch (role) {
      case 'super_admin':
        return [
          { href: '/super-admin', label: 'Admin', icon: ShieldAlert },
          { href: '/institutes', label: 'Institutes', icon: Building2 },
          { href: '/settings', label: t('nav.settings', 'Settings'), icon: Settings },
          { label: 'Menu', icon: Menu, isMenuTrigger: true },
        ];
      case 'institute_admin':
        return [
          { href: '/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
          { href: '/online-classes', label: 'Zoom Class', icon: Video },
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { href: '/fees', label: t('nav.fees', 'Fees'), icon: CreditCard },
          { label: 'More', icon: Menu, isMenuTrigger: true },
        ];
      case 'teacher':
        return [
          { href: '/dashboard', label: t('nav.dashboard', 'Today'), icon: LayoutDashboard },
          { href: '/online-classes', label: 'Zoom Class', icon: Video },
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { href: '/timetable', label: t('nav.timetable', 'Schedule'), icon: Clock },
          { label: 'More', icon: Menu, isMenuTrigger: true },
        ];
      case 'parent':
      default:
        return [
          { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { href: '/online-classes', label: 'Zoom Class', icon: Video },
          { href: '/fees', label: t('nav.fees', 'Fees'), icon: CreditCard },
          { href: '/attendance', label: t('nav.attendance', 'Attendance'), icon: CalendarCheck },
          { label: 'More', icon: Menu, isMenuTrigger: true },
        ];
    }
  };

  const navItems = getNavItems();
  const mainHrefs = navItems.filter((i) => !i.isMenuTrigger).map((i) => i.href);
  const isMoreActive = !mainHrefs.includes(pathname);

  const handleOpenDrawer = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-mobile-drawer'));
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe sm:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;

          if (item.isMenuTrigger) {
            return (
              <button
                key="menu-trigger"
                onClick={handleOpenDrawer}
                className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-manipulation transition-all active:scale-95 ${
                  isMoreActive ? 'text-[#4338ca] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
                aria-label="Open Full Navigation Menu"
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isMoreActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] leading-tight tracking-tight">{item.label}</span>
                {isMoreActive && (
                  <span className="w-5 h-[3px] rounded-full bg-[#4338ca] mt-0.5" />
                )}
              </button>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href || idx}
              href={item.href || '#'}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-manipulation transition-all active:scale-95 ${
                isActive ? 'text-[#4338ca] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] leading-tight tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-5 h-[3px] rounded-full bg-[#4338ca] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
