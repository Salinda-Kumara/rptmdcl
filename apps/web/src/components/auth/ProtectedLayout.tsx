'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    // Wait until the persisted auth state has rehydrated before deciding —
    // otherwise a fresh tab / hard reload redirects to login prematurely.
    if (hasHydrated && !isAuthenticated) {
      const loginPath =
        pathname?.startsWith('/dashboard/staff') || pathname?.startsWith('/dashboard/admin')
          ? '/login/staff'
          : '/student';
      router.push(loginPath);
    }
  }, [hasHydrated, isAuthenticated, router, pathname]);

  // Show a loader while hydrating or if not authenticated (redirect pending).
  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
