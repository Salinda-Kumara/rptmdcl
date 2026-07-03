'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard, FileText, Wallet, BarChart3, CalendarDays,
  LogOut, Crown, Menu, X, Users, GraduationCap, BookOpen,
  Layers, UserSquare2, UserCog, ChevronDown, Settings, Database, ScrollText,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { useMyPermissions, can } from '@/lib/permissions';

// Panels
import { AdminDashboardPanel } from './panels/AdminDashboardPanel';
import { UsersPanel }         from './panels/UsersPanel';
import { ProgrammesPanel }    from './panels/ProgrammesPanel';
import { SubjectsPanel }      from './panels/SubjectsPanel';
import { BatchesPanel }       from './panels/BatchesPanel';
import { ExamSchedulesPanel } from './panels/ExamSchedulesPanel';
import { ApplicationsPanel }  from '@/components/staff/panels/ApplicationsPanel';
import { ApplicationDetailPanel } from '@/components/staff/panels/ApplicationDetailPanel';

import { StudentsPanel }       from './panels/StudentsPanel';
import { StudentManagePanel }  from './panels/StudentManagePanel';
import { ReportsPanel }        from './panels/ReportsPanel';
import { LogsPanel }           from './panels/LogsPanel';
import { ThemeToggle }         from '@/components/ThemeToggle';

type View =
  | 'dashboard' | 'applications' | 'app-detail' | 'payments' | 'reports'
  | 'users' | 'students-import' | 'students' | 'programmes' | 'subjects' | 'batches' | 'schedules' | 'logs';

interface TopNavItem { view: View; label: string; icon: React.ComponentType<{ className?: string }>; resource?: string; }
interface AdminNavItem { view: View; label: string; icon: React.ComponentType<{ className?: string }>; }

const TOP_NAV: TopNavItem[] = [
  { view: 'dashboard',        label: 'Dashboard',       icon: LayoutDashboard },
  { view: 'applications',     label: 'Applications',    icon: FileText,      resource: 'applications' },
  { view: 'payments',         label: 'Payments',        icon: Wallet,        resource: 'payments' },
  { view: 'students-import',  label: 'Students',        icon: UserSquare2,   resource: 'students' },
  { view: 'schedules',        label: 'Exam Schedules',  icon: CalendarDays,  resource: 'schedules' },
  { view: 'reports',          label: 'Reports',         icon: BarChart3,     resource: 'reports' },
];

const MASTER_NAV: TopNavItem[] = [
  { view: 'programmes', label: 'Programmes', icon: GraduationCap, resource: 'programmes' },
  { view: 'subjects',   label: 'Subjects',   icon: BookOpen,      resource: 'subjects' },
  { view: 'batches',    label: 'Batches',    icon: Layers,        resource: 'batches' },
];

const ADMIN_NAV: AdminNavItem[] = [
  { view: 'users',    label: 'Staff & Permissions', icon: Users },
  { view: 'students', label: 'Student Manage',      icon: UserCog },
  { view: 'logs',     label: 'Activity Logs',       icon: ScrollText },
];

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
      <p className="text-lg font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-300">Coming soon</p>
    </div>
  );
}


export function AdminShell() {
  const { user, logout } = useAuth();
  const { isAdmin, permissions, name } = useMyPermissions();
  const [view, setView] = useState<View>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [logsSerial, setLogsSerial] = useState<string | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [masterExpanded, setMasterExpanded] = useState(false);

  const ADMIN_VIEWS: Set<View> = new Set(ADMIN_NAV.map((n) => n.view));
  const MASTER_VIEWS: Set<View> = new Set(MASTER_NAV.map((n) => n.view));

  const navigate = (v: string, id?: string) => {
    const nextView = v as View;
    setView(nextView);
    if (id) setSelectedAppId(id);
    // Opening Logs from the menu (no serial) clears any per-application filter.
    if (nextView === 'logs') setLogsSerial(undefined);
    setMobileOpen(false);
    if (ADMIN_VIEWS.has(nextView)) setAdminExpanded(true);
    if (MASTER_VIEWS.has(nextView)) setMasterExpanded(true);
    window.scrollTo({ top: 0 });
  };

  // Deep link: open the Logs view pre-filtered to one application's serial number.
  const openLogsForSerial = (serial: string) => {
    setLogsSerial(serial);
    setView('logs');
    setAdminExpanded(true);
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  };

  const displayName = name || user?.name || user?.email || 'Admin';
  const initials = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const activeView = view === 'app-detail' ? 'applications' : view;
  const isAdminSection = ADMIN_VIEWS.has(view);
  const isMasterSection = MASTER_VIEWS.has(view);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-700/50 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none text-white">ERMAS</p>
          <p className="mt-0.5 text-[10px] text-amber-300">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Top-level nav — always show Dashboard; others filtered by permission */}
        <div className="space-y-1">
          {TOP_NAV.filter((item) => !item.resource || isAdmin || can(permissions, item.resource, 'VIEW')).map((item) => {
            const active = activeView === item.view && !isAdminSection && !isMasterSection;
            const Icon = item.icon;
            return (
              <button key={item.view} onClick={() => navigate(item.view)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-all ${
                  active ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                         : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Master Menu collapsible group */}
        {(isAdmin || MASTER_NAV.some((n) => can(permissions, n.resource!, 'VIEW'))) && (
          <div className="mt-4">
            <button
              onClick={() => setMasterExpanded((v) => !v)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-all ${
                isMasterSection ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <Database className={`h-[18px] w-[18px] ${isMasterSection ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="flex-1">Master Menu</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${masterExpanded ? 'rotate-180' : ''} ${isMasterSection ? 'text-amber-400' : 'text-slate-500'}`} />
            </button>

            {masterExpanded && (
              <div className="mt-1 ml-3 space-y-0.5 border-l border-slate-700/60 pl-3">
                {MASTER_NAV.filter((n) => isAdmin || can(permissions, n.resource!, 'VIEW')).map((item) => {
                  const active = view === item.view;
                  const Icon = item.icon;
                  return (
                    <button key={item.view} onClick={() => navigate(item.view)}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-left transition-all ${
                        active ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                               : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`h-[17px] w-[17px] ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Administration collapsible group — Master Admin only */}
        {isAdmin && <div className="mt-4">
          <button
            onClick={() => setAdminExpanded((v) => !v)}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-all ${
              isAdminSection ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <Settings className={`h-[18px] w-[18px] ${isAdminSection ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <span className="flex-1">Administration</span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${adminExpanded ? 'rotate-180' : ''} ${isAdminSection ? 'text-amber-400' : 'text-slate-500'}`} />
          </button>

          {adminExpanded && (
            <div className="mt-1 ml-3 space-y-0.5 border-l border-slate-700/60 pl-3">
              {ADMIN_NAV.map((item) => {
                const active = view === item.view;
                const Icon = item.icon;
                return (
                  <button key={item.view} onClick={() => navigate(item.view)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-left transition-all ${
                      active ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                             : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`h-[17px] w-[17px] ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>}
      </nav>

    </>
  );

  // Profile cluster shown at the top-right of the header (desktop + mobile).
  const ProfileCluster = () => (
    <div className="flex items-center gap-2 sm:gap-3">
      <ThemeToggle compact />
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight text-slate-900 dark:text-gray-100">{displayName}</p>
        <p className="text-[11px] leading-tight text-amber-600 dark:text-amber-400">{isAdmin ? 'Master Admin' : 'Staff'}</p>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-semibold text-white">
        {initials}
      </div>
      <button
        onClick={logout}
        title="Sign out"
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
          <SidebarContent />
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900">
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              <SidebarContent />
            </aside>
          </div>
        )}

        <div className="lg:pl-64">
          {/* Top header — profile cluster shows only on the Dashboard view.
              On other views the desktop bar is hidden; the mobile nav bar stays. */}
          <header className={`sticky top-0 z-30 h-14 items-center gap-3 border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 sm:px-6 ${view === 'dashboard' ? 'flex' : 'flex lg:hidden'}`}>
            <button onClick={() => setMobileOpen(true)} className="text-slate-600 dark:text-gray-400 lg:hidden">
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-gray-100 lg:hidden">ERMAS Admin</span>
            {view === 'dashboard' && (
              <div className="ml-auto">
                <ProfileCluster />
              </div>
            )}
          </header>

          <main className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {view === 'dashboard'      && <AdminDashboardPanel onNavigate={navigate} />}
            {view === 'applications'   && <ApplicationsPanel onNavigate={navigate} />}
            {view === 'app-detail'     && selectedAppId && <ApplicationDetailPanel id={selectedAppId} onBack={() => navigate('applications')} onViewLogs={isAdmin ? openLogsForSerial : undefined} />}
            {view === 'payments'       && <ComingSoon label="Payments" />}
            {view === 'reports'        && <ReportsPanel />}
            {view === 'users'          && <UsersPanel />}
            {view === 'students-import' && <StudentsPanel onNavigate={navigate} />}
            {view === 'students'       && <StudentManagePanel />}
            {view === 'programmes'     && <ProgrammesPanel />}
            {view === 'subjects'       && <SubjectsPanel />}
            {view === 'batches'        && <BatchesPanel />}
            {view === 'schedules'      && <ExamSchedulesPanel />}
            {view === 'logs'           && <LogsPanel key={logsSerial || 'all'} serial={logsSerial} />}
          </main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
