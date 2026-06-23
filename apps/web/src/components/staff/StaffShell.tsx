'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  CalendarDays,
  BarChart3,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { staffApi, rolesOf, ROLE_LABELS } from '@/lib/staff-api';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  roles?: string[]; // visible only to these roles (undefined = all staff)
}

const NAV: NavItem[] = [
  { href: '/dashboard/staff', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/staff/applications', label: 'Applications', icon: FileText },
  { href: '/dashboard/staff/payments', label: 'Payments', icon: Wallet, roles: ['FINANCE_OFFICER', 'SUPER_ADMIN'] },
  { href: '/dashboard/staff/schedules', label: 'Schedules', icon: CalendarDays, roles: ['SCHEDULE_OFFICER', 'EXAM_MANAGER', 'SUPER_ADMIN'] },
  { href: '/dashboard/staff/reports', label: 'Reports', icon: BarChart3, roles: ['REGISTRAR', 'DIRECTOR', 'SUPER_ADMIN'] },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [roles, setRoles] = useState<string[]>([]);
  const [name, setName] = useState<string>('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    staffApi.getProfile()
      .then((u) => {
        setRoles(rolesOf(u));
        setName(u?.staffUser?.name || u?.email || '');
      })
      .catch(() => {});
  }, []);

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)));
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  const displayName = name || user?.name || user?.email || 'Staff';
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel = roles.map((r) => ROLE_LABELS[r] || r).join(', ');

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-indigo-800/50">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 shadow-lg">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">ERMAS</p>
          <p className="text-[10px] text-indigo-300 mt-0.5">Staff Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                  : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-indigo-800/50 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-700 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-[11px] text-indigo-300">{roleLabel || 'Staff'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-200 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-slate-50">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-indigo-950 lg:flex">
          <SidebarContent />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-indigo-950">
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-indigo-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        <div className="lg:pl-64">
          <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="text-slate-600">
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-sm font-semibold text-slate-900">ERMAS Staff</span>
          </div>

          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
