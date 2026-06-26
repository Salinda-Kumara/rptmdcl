'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  TrendingUp,
  ArrowRight,
  Inbox,
  ChevronRight,
} from 'lucide-react';
import { StaffShell } from '@/components/staff/StaffShell';
import { staffApi, StaffStats, StaffApplication, formatLKR } from '@/lib/staff-api';
import { useMyPermissions, can } from '@/lib/permissions';
import { STATUS_LABELS, STATUS_COLORS, formatFee } from '@/lib/applications-api';

export default function StaffDashboard() {
  const { isAdmin, permissions } = useMyPermissions();
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [queue, setQueue] = useState<StaffApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      staffApi.getStats().then(setStats).catch(() => {}),
      staffApi.getApplications({ status: 'SUBMITTED' }).then((a) => setQueue(a.slice(0, 6))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const isFinance = isAdmin || can(permissions, 'payments', 'FULL');

  const statCards = [
    { label: 'Total Applications', value: stats?.total, icon: FileText, ring: 'bg-indigo-50 text-indigo-600', tint: 'from-indigo-500 to-violet-500' },
    { label: 'Pending Review', value: stats?.pending, icon: Clock, ring: 'bg-amber-50 text-amber-600', tint: 'from-amber-500 to-orange-500' },
    { label: 'Approved', value: stats?.approved, icon: CheckCircle2, ring: 'bg-emerald-50 text-emerald-600', tint: 'from-emerald-500 to-green-500' },
    { label: 'Rejected', value: stats?.rejected, icon: XCircle, ring: 'bg-rose-50 text-rose-600', tint: 'from-rose-500 to-red-500' },
  ];

  return (
    <StaffShell>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of examination repeat &amp; medical applications.</p>
      </div>

      {/* Stat cards */}
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{s.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading || s.value === undefined ? <span className="text-slate-300">—</span> : s.value}
                  </p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.ring}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${s.tint} opacity-0 transition-opacity group-hover:opacity-100`} />
            </div>
          );
        })}
      </div>

      {/* Secondary metrics */}
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Wallet className="h-4 w-4" />
            <p className="text-sm font-medium">Pending Payments</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? '—' : stats?.pendingPayments ?? 0}
          </p>
          {isFinance && (
            <Link href="/dashboard/staff/payments" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
              Verify payments <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-4 w-4" />
            <p className="text-sm font-medium">Verified Revenue</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? '—' : formatLKR(stats?.verifiedRevenue ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">By Type</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Repeat</span>
              <span className="font-semibold text-slate-800">{stats?.byType.repeat ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Medical</span>
              <span className="font-semibold text-slate-800">{stats?.byType.medical ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review queue */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Review Queue</h2>
            <p className="text-xs text-slate-400">Newly submitted applications awaiting action</p>
          </div>
          <Link href="/dashboard/staff/applications" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Inbox className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">Queue is clear</p>
            <p className="mt-1 text-sm text-slate-400">No applications awaiting review.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map((app) => (
              <li key={app.id}>
                <Link href={`/dashboard/staff/applications/${app.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${app.type === 'MEDICAL' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {app.student?.fullName || 'Unknown student'}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {app.student?.registrationNumber} · {app.type === 'MEDICAL' ? 'Medical' : 'Repeat'} · {app.applicationSubjects.length} subject(s) · {formatFee(app.totalFee)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[app.status] || app.status}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StaffShell>
  );
}
