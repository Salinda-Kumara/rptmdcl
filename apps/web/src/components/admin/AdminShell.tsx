'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  CalendarDays,
  LogOut,
  Crown,
  Menu,
  X,
  FileText,
  UserSquare2,
  UserCog,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { useMyPermissions, can, AccessLevel } from '@/lib/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  resource?: string; // visible when the user can VIEW this resource (admins see all)
}

const NAV: NavItem[] = [
  { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/admin/users', label: 'Staff & Permissions', icon: Users, resource: 'users' },
  { href: '/dashboard/admin/students', label: 'Student Import', icon: UserSquare2, resource: 'students' },
  { href: '/dashboard/admin/student-manage', label: 'Student Manage', icon: UserCog, resource: 'students' },
  { href: '/dashboard/admin/programmes', label: 'Programmes', icon: GraduationCap, resource: 'programmes' },
  { href: '/dashboard/admin/subjects', label: 'Subjects', icon: BookOpen, resource: 'subjects' },
  { href: '/dashboard/admin/batches', label: 'Batches', icon: Layers, resource: 'batches' },
  { href: '/dashboard/admin/schedules', label: 'Exam Schedules', icon: CalendarDays, resource: 'schedules' },
  { href: '/dashboard/staff/applications', label: 'Applications', icon: FileText, resource: 'applications' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { isAdmin, permissions, name } = useMyPermissions();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV.filter((n) => !n.resource || isAdmin || can(permissions, n.resource, 'VIEW' as AccessLevel));
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const displayName = name || user?.name || user?.email || 'Admin';
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const roleLabel = isAdmin ? 'Master Admin' : 'Staff';

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-700/50 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-white">ERMAS</p>
          <p className="mt-0.5 text-[10px] text-amber-300">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
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
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700/50 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-[11px] text-amber-300/80">{roleLabel || 'Administrator'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
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
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
          <SidebarContent />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900">
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-slate-400 hover:text-white">
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
            <span className="text-sm font-semibold text-slate-900">ERMAS Admin</span>
          </div>

          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
