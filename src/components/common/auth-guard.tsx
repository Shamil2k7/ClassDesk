'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2, XCircle, ShieldCheck, LogOut } from 'lucide-react';

// Public routes accessible without authentication
const PUBLIC_ROUTES = ['/login', '/install'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, institute, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Handle BFCache (Mobile Back-Forward Cache) and PopState
  useEffect(() => {
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem('classdesk_auth_user');
      const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
      if (!storedUser && !isPublic) {
        window.location.replace('/login');
      }
    };

    // When page is restored from mobile browser back-forward cache (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkAuthStatus();
      }
    };

    // When user presses browser / hardware back button
    const handlePopState = () => {
      checkAuthStatus();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  // 2. Active route protection during normal navigation
  useEffect(() => {
    if (!mounted || loading) return;

    const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    if (!isAuthenticated && !isPublic) {
      window.location.replace('/login');
    }
  }, [mounted, loading, isAuthenticated, pathname]);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // If loading and on a protected route, show clean loading placeholder
  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-semibold text-slate-500">Checking session...</p>
      </div>
    );
  }

  // If unauthenticated and on protected route, do NOT render the protected content
  if (!loading && !isAuthenticated && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-semibold text-slate-500">Redirecting to login...</p>
      </div>
    );
  }

  // 3. INSTITUTE SUSPENSION ENFORCEMENT
  // If user belongs to a suspended institute (and is not super_admin), block access with clear notice
  const isInstituteSuspended =
    user?.role !== 'super_admin' &&
    institute &&
    (institute.status === 'suspended' || institute.subscription_status === 'canceled');

  if (!isPublicRoute && isInstituteSuspended) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <XCircle className="w-9 h-9" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wider mb-2">
              Institute Suspended
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              {institute?.name}
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              This institute&apos;s account has been temporarily suspended by the platform administrator. Access to protected features, dashboards, and student tools is currently restricted.
            </p>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Data Protection Notice</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-normal">
              All student databases, fee ledgers, exam grades, and attendance records remain strictly preserved. No data has been deleted.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={async () => {
                setIsLoggingOut(true);
                await logout();
              }}
              disabled={isLoggingOut}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Logging out...' : 'Sign Out / Switch Account'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
