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
  Menu,
  X,
  LifeBuoy,
  Mail,
  Phone,
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
  const [supportOpen, setSupportOpen] = useState(false);

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
        <img src="/sab-campus-logo.png" alt="SAB" className="h-8 w-auto max-w-[120px] object-contain" />
        <div className="border-l border-slate-700 pl-2.5">
          <p className="text-sm font-bold text-white leading-none">ERMS</p>
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
            <span className="text-sm font-semibold text-slate-900">ERMS</span>
          </div>

          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>

        {/* Floating support widget */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
          {supportOpen && (
            <div className="w-[22rem] max-w-[calc(100vw-2.5rem)] origin-bottom-right animate-[supportIn_.18s_ease-out] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-black/5">
              <style>{`@keyframes supportIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-5 pb-6 pt-5">
                <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-12 -left-4 h-24 w-24 rounded-full bg-white/10" />
                <button
                  onClick={() => setSupportOpen(false)}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="relative flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                    <LifeBuoy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold leading-tight text-white">Help &amp; Support</p>
                    <p className="text-xs text-blue-100">We're here to help you</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-4 pb-5 pt-4">
                {/* Examinations */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Examinations
                  </p>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-1.5">
                    <a href="mailto:examination@sab.casrilanka.com" className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-white hover:shadow-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <Mail className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-slate-400">Email</span>
                        <span className="block truncate text-sm font-medium text-slate-700">examination@sab.casrilanka.com</span>
                      </span>
                    </a>
                    <a href="tel:+94112101044" className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-white hover:shadow-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                        <Phone className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-slate-400">Hotline</span>
                        <span className="block text-sm font-medium text-slate-700">
                          +94 11 210 1044
                          <span className="ml-1.5 rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Ext 1043</span>
                        </span>
                      </span>
                    </a>
                  </div>
                </div>

                {/* Technical Support */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Technical Support
                  </p>
                  <div className="space-y-2">
                    {[
                      { name: 'Salinda Wickramasinghe', email: 'salinda.wickramasinghe@sab.casrilanka.com', tel: '+94772818574', telLabel: '+94 77 281 8574', wa: 'https://wa.me/94772818574' },
                      { name: 'Sandun Pathirana', email: 'sandun.pathirana@sab.casrilanka.com', tel: '+94706326877', telLabel: '+94 70 632 6877', wa: 'https://wa.me/94706326877' },
                    ].map((p) => (
                      <div key={p.email} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                        <div className="mb-1.5 flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
                            {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                        </div>
                        <div className="flex flex-col gap-1 pl-0.5">
                          <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-blue-600">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" /> <span className="truncate">{p.email}</span>
                          </a>
                          <a href={p.wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-green-600">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-green-500" aria-hidden="true">
                              <path d="M17.47 14.38c-.29-.15-1.71-.84-1.97-.94-.26-.1-.46-.15-.65.15-.19.29-.74.94-.91 1.13-.17.19-.34.22-.63.07-.29-.15-1.22-.45-2.33-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.65-1.57-.89-2.15-.24-.56-.48-.49-.65-.5-.17-.01-.36-.01-.55-.01-.19 0-.51.07-.77.36-.26.29-1.01.99-1.01 2.41 0 1.42 1.04 2.79 1.18 2.98.15.19 2.05 3.13 4.96 4.39.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.11.56-.08 1.71-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.34zM12.01 21.5h-.01c-1.77 0-3.51-.48-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37A9.44 9.44 0 0 1 2.5 12c0-5.24 4.27-9.5 9.51-9.5 2.54 0 4.93.99 6.72 2.79a9.44 9.44 0 0 1 2.78 6.72c0 5.24-4.27 9.49-9.5 9.49zM20.5 3.49A11.83 11.83 0 0 0 12.01.5C5.5.5.5 5.5.5 12c0 2.02.53 3.99 1.53 5.73L.4 23.5l5.9-1.55A11.9 11.9 0 0 0 12 23.5h.01c6.5 0 11.5-5 11.5-11.5 0-3.19-1.25-6.19-3.51-8.51z"/>
                            </svg> {p.telLabel}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setSupportOpen((v) => !v)}
            title="Help & Support"
            className={`group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30 transition-all hover:shadow-xl hover:shadow-blue-900/40 ${supportOpen ? 'rotate-90 scale-95' : 'hover:scale-105'}`}
          >
            {supportOpen ? <X className="h-6 w-6" /> : <LifeBuoy className="h-6 w-6 transition-transform group-hover:rotate-12" />}
          </button>
        </div>
      </div>
    </ProtectedLayout>
  );
}

export { type StudentProfile };
