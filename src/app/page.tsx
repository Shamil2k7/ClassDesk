'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        router.replace(user.role === 'super_admin' ? '/super-admin' : '/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, user, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading ClassDesk...</p>
      </div>
    </div>
  );
}
