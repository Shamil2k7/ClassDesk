'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

// Public routes accessible without authentication
const PUBLIC_ROUTES = ['/login', '/install'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

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

  return <>{children}</>;
}
