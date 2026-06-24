'use client';

import React from 'react';
import { useAuth } from '@/lib/use-auth';
import { useRouter, usePathname } from 'next/navigation';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedLayout({ children, requiredRole }: ProtectedLayoutProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isAuthenticated) {
      // Send students back to /student, staff back to their login
      const loginPath =
        pathname?.startsWith('/dashboard/staff') || pathname?.startsWith('/dashboard/admin')
          ? '/login/staff'
          : '/student';
      router.push(loginPath);
    }
  }, [isAuthenticated, router, pathname]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
