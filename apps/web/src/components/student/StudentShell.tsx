'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  User,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { studentsApi } from '@/lib/applications-api';

interface StudentProfile {
  fullName: string;
  registrationNumber: string;
  batchNumber: string;
  email: string;
  batch?: { programme?: { name: string; code: string } };
}

const NAV = [
  { href: '/dashboard/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/student/applications', label: 'My Applications', icon: FileText, exact: false },
  { href: '/dashboard/student/applications/new', label: 'New Application', icon: PlusCircle, exact: true },
  { href: '/dashboard/student/profile', label: 'Profile', icon: User, exact: true },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    studentsApi.getProfile().then(setProfile).catch(() => {});
  }, []);

  // Pick a single active item: an exact route (e.g. New Application) wins over a
  // prefix route (My Applications), so both never highlight at once.
  const activeHref = (() => {
    const exact = NAV.find((i) => i.exact && pathname === i.href);
    if (exact) return exact.href;
    return NAV.filter((i) => !i.exact && pathname.startsWith(i.href))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  })();
  const isActive = (item: (typeof NAV)[number]) => item.href === activeHref;

  const initials = (profile?.fullName || user?.name || user?.email || 'S')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-800/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/30">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">ERMAS</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Student Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-slate-800/60 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{profile?.fullName || user?.name}</p>
            <p className="truncate text-[11px] text-slate-400">{profile?.registrationNumber || user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="lg:pl-64">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="text-slate-600">
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-sm font-semibold text-slate-900">ERMAS</span>
          </div>

          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </ProtectedLayout>
  );
}

export { type StudentProfile };
