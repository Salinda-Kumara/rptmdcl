'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard, FileText, CalendarDays, GraduationCap,
  BarChart3, LogOut, ShieldCheck, Menu, X, Crown,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { useMyPermissions, can } from '@/lib/permissions';
import { DashboardPanel } from './panels/DashboardPanel';
import { ApplicationsPanel } from './panels/ApplicationsPanel';
import { ApplicationDetailPanel } from './panels/ApplicationDetailPanel';
import { ReportsPanel } from '@/components/admin/panels/ReportsPanel';
import { ExamSchedulesPanel } from '@/components/admin/panels/ExamSchedulesPanel';
import { ScheduleDetailPanel } from '@/components/admin/panels/ScheduleDetailPanel';
import { AdmissionsPanel } from '@/components/admin/panels/AdmissionsPanel';
import { ThemeToggle } from '@/components/ThemeToggle';

type View = 'dashboard' | 'applications' | 'app-detail' | 'schedules' | 'schedule-detail' | 'admissions' | 'reports' | 'admin';

interface NavItem {
  view: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource?: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { view: 'dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { view: 'applications', label: 'Applications',  icon: FileText,      resource: 'applications' },
  { view: 'schedules',    label: 'Schedules',     icon: CalendarDays,  resource: 'schedules' },
  { view: 'admissions',   label: 'Admissions',    icon: GraduationCap, resource: 'admissions' },
  { view: 'reports',      label: 'Reports',       icon: BarChart3,     resource: 'reports' },
  { view: 'admin',        label: 'Admin Console', icon: Crown,         adminOnly: true },
];

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
      <p className="text-lg font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-300">Coming soon</p>
    </div>
  );
}

export function StaffShell() {
  const { user, logout } = useAuth();
  const { isAdmin, permissions, name } = useMyPermissions();
  const [view, setView] = useState<View>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = (v: string, id?: string) => {
    setView(v as View);
    if (id) setSelectedAppId(id);
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  };

  const openSchedule = (id: string) => { setSelectedScheduleId(id); setView('schedule-detail'); window.scrollTo({ top: 0 }); };

  const visibleNav = NAV.filter((n) => {
    if (n.adminOnly) return isAdmin;
    if (!n.resource) return true;
    return isAdmin || can(permissions, n.resource, 'VIEW');
  });

  const displayName = name || user?.name || user?.email || 'Staff';
  const initials = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const activeView = view === 'app-detail' ? 'applications' : view === 'schedule-detail' ? 'schedules' : view;

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
          const active = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left ${
                active
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                  : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} />
              {item.label}
            </button>
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
            <p className="truncate text-[11px] text-indigo-300">{isAdmin ? 'Master Admin' : 'Staff'}</p>
          </div>
        </div>
        <ThemeToggle />
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
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
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
          <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="text-slate-600 dark:text-gray-400">
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-gray-100">ERMAS Staff</span>
          </div>

          <main className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {view === 'dashboard'    && <DashboardPanel onNavigate={navigate} />}
            {view === 'applications' && <ApplicationsPanel onNavigate={navigate} />}
            {view === 'app-detail'   && selectedAppId && <ApplicationDetailPanel id={selectedAppId} onBack={() => navigate('applications')} />}
            {view === 'schedules'    && <ExamSchedulesPanel onOpen={openSchedule} />}
            {view === 'schedule-detail' && selectedScheduleId && <ScheduleDetailPanel scheduleId={selectedScheduleId} onBack={() => navigate('schedules')} />}
            {view === 'admissions'   && <AdmissionsPanel />}
            {view === 'reports'      && <ReportsPanel />}
            {view === 'admin'        && <ComingSoon label="Admin Console" />}
          </main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
