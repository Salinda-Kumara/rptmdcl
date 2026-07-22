'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  LayoutDashboard, FileText, CalendarDays, GraduationCap,
  BarChart3, LogOut, Menu, X, Crown, UserSquare2,
  PanelLeftClose, PanelLeftOpen, Loader2, TrendingUp, HeartPulse,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { useMyPermissions, can } from '@/lib/permissions';
import { ThemeToggle } from '@/components/ThemeToggle';

// Default dashboard is eager (shown first); other panels lazy-load on demand,
// so their JS downloads only when that view is opened.
import { DashboardPanel } from './panels/DashboardPanel';

const PanelFallback = () => (
  <div className="flex items-center justify-center py-20 text-slate-400">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
);
const ApplicationsPanel      = dynamic(() => import('./panels/ApplicationsPanel').then((m) => m.ApplicationsPanel), { loading: PanelFallback, ssr: false });
const ApplicationDetailPanel = dynamic(() => import('./panels/ApplicationDetailPanel').then((m) => m.ApplicationDetailPanel), { loading: PanelFallback, ssr: false });
const ReportsPanel           = dynamic(() => import('@/components/admin/panels/ReportsPanel').then((m) => m.ReportsPanel), { loading: PanelFallback, ssr: false });
const ExamSchedulesPanel     = dynamic(() => import('@/components/admin/panels/ExamSchedulesPanel').then((m) => m.ExamSchedulesPanel), { loading: PanelFallback, ssr: false });
const ScheduleDetailPanel    = dynamic(() => import('@/components/admin/panels/ScheduleDetailPanel').then((m) => m.ScheduleDetailPanel), { loading: PanelFallback, ssr: false });
const AdmissionsPanel        = dynamic(() => import('@/components/admin/panels/AdmissionsPanel').then((m) => m.AdmissionsPanel), { loading: PanelFallback, ssr: false });
const StudentsPanel          = dynamic(() => import('@/components/admin/panels/StudentsPanel').then((m) => m.StudentsPanel), { loading: PanelFallback, ssr: false });
const AnalyticsPanel         = dynamic(() => import('@/components/admin/panels/AnalyticsPanel').then((m) => m.AnalyticsPanel), { loading: PanelFallback, ssr: false });
const MedicalsPanel          = dynamic(() => import('@/components/admin/panels/MedicalsPanel').then((m) => m.MedicalsPanel), { loading: PanelFallback, ssr: false });

type View = 'dashboard' | 'applications' | 'app-detail' | 'schedules' | 'schedule-detail' | 'admissions' | 'students' | 'analytics' | 'medicals' | 'reports' | 'admin';

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
  { view: 'medicals',     label: 'Medical Submissions', icon: HeartPulse, resource: 'medicals' },
  { view: 'schedules',    label: 'Schedules',     icon: CalendarDays,  resource: 'schedules' },
  { view: 'admissions',   label: 'Admissions',    icon: GraduationCap, resource: 'admissions' },
  { view: 'students',     label: 'Students',      icon: UserSquare2,   resource: 'students' },
  { view: 'analytics',    label: 'Analytics',     icon: TrendingUp,    resource: 'analytics' },
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
  const [selectedMedicalId, setSelectedMedicalId] = useState<string | undefined>(undefined);
  const [medicalsReturnView, setMedicalsReturnView] = useState<string | undefined>(undefined);
  const [selectedStudentReg, setSelectedStudentReg] = useState<string | undefined>(undefined);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Remember the collapsed state across sessions.
  useEffect(() => { if (localStorage.getItem('staffSidebarCollapsed') === '1') setCollapsed(true); }, []);
  const applyCollapsed = (n: boolean) => { setCollapsed(n); localStorage.setItem('staffSidebarCollapsed', n ? '1' : '0'); };

  const navigate = (v: string, id?: string, returnParam?: string) => {
    const nextView = v as View;
    if (nextView === 'medicals') {
      setSelectedMedicalId(id);
      setMedicalsReturnView(view);
      setSelectedStudentReg(returnParam);
    }
    if (nextView === 'students') {
      if (returnParam) setSelectedStudentReg(returnParam);
    }
    setView(nextView);
    if (id && nextView === 'app-detail') setSelectedAppId(id);
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

  const SidebarContent = ({ mini = false }: { mini?: boolean }) => (
    <>
      <div className={`flex h-16 items-center border-b border-indigo-800/50 ${mini ? 'justify-center px-0' : 'gap-2.5 px-6'}`}>
        {mini ? (
          <button onClick={() => applyCollapsed(false)} title="Expand menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-indigo-300 hover:bg-indigo-800/60 hover:text-white">
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        ) : (
          <>
            <img src="/sab-campus-logo.png" alt="SAB" className="h-8 w-auto max-w-[110px] object-contain" />
            <div className="flex-1 border-l border-indigo-700 pl-2.5">
              <p className="text-sm font-bold text-white leading-none">ERMS</p>
              <p className="text-[10px] text-indigo-300 mt-0.5">Staff Portal</p>
            </div>
            <button onClick={() => applyCollapsed(true)} title="Collapse menu"
              className="hidden rounded-lg p-1.5 text-indigo-300 hover:bg-indigo-800/60 hover:text-white lg:block">
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const active = activeView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              title={mini ? item.label : undefined}
              className={`group flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-all text-left ${
                mini ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                active
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                  : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} />
              {!mini && item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-indigo-800/50 p-3">
        {mini ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-700 text-xs font-semibold text-white" title={displayName}>
              {initials}
            </div>
            <ThemeToggle compact />
            <button onClick={logout} title="Sign out"
              className="rounded-lg p-2 text-indigo-200 transition-colors hover:bg-red-500/10 hover:text-red-300">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </>
  );

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-indigo-950 transition-[width] duration-200 lg:flex ${collapsed ? 'w-16' : 'w-64'}`}>
          <SidebarContent mini={collapsed} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-indigo-950">
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-indigo-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
              <SidebarContent mini={false} />
            </aside>
          </div>
        )}

        <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
          <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="text-slate-600 dark:text-gray-400">
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-gray-100">ERMS Staff</span>
          </div>

          <main className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {view === 'dashboard'    && <DashboardPanel onNavigate={navigate} />}
            {view === 'applications' && <ApplicationsPanel onNavigate={navigate} />}
            {view === 'app-detail'   && selectedAppId && <ApplicationDetailPanel id={selectedAppId} onBack={() => navigate('applications')} />}
            {view === 'schedules'    && <ExamSchedulesPanel onOpen={openSchedule} />}
            {view === 'schedule-detail' && selectedScheduleId && <ScheduleDetailPanel scheduleId={selectedScheduleId} onBack={() => navigate('schedules')} />}
            {view === 'admissions'   && <AdmissionsPanel />}
            {view === 'students'     && <StudentsPanel onNavigate={navigate} initialStudentReg={selectedStudentReg} />}
            {view === 'analytics'    && <AnalyticsPanel />}
            {view === 'medicals'     && (
              <MedicalsPanel
                key={selectedMedicalId || 'all'}
                initialId={selectedMedicalId}
                onBack={medicalsReturnView ? () => navigate(medicalsReturnView, undefined, selectedStudentReg) : undefined}
                backLabel={medicalsReturnView ? 'Back to Student Detail' : undefined}
              />
            )}
            {view === 'reports'      && <ReportsPanel />}
            {view === 'admin'        && <ComingSoon label="Admin Console" />}
          </main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
