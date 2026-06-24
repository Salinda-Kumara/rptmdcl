'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, BookOpen, Layers, CalendarDays, FileText,
  Wallet, ArrowRight, TrendingUp,
} from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminApi, AdminStats } from '@/lib/admin-api';
import { STATUS_LABELS, STATUS_COLORS, formatFee } from '@/lib/applications-api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Staff Users', value: stats?.totalStaff, icon: Users, href: '/dashboard/admin/users', tint: 'bg-blue-50 text-blue-600' },
    { label: 'Students', value: stats?.totalStudents, icon: GraduationCap, href: '/dashboard/admin/batches', tint: 'bg-violet-50 text-violet-600' },
    { label: 'Programmes', value: stats?.totalProgrammes, icon: GraduationCap, href: '/dashboard/admin/programmes', tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Subjects', value: stats?.totalSubjects, icon: BookOpen, href: '/dashboard/admin/subjects', tint: 'bg-amber-50 text-amber-600' },
    { label: 'Batches', value: stats?.totalBatches, icon: Layers, href: '/dashboard/admin/batches', tint: 'bg-cyan-50 text-cyan-600' },
    { label: 'Exam Schedules', value: stats?.totalSchedules, icon: CalendarDays, href: '/dashboard/admin/schedules', tint: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Console</h1>
        <p className="mt-1 text-sm text-slate-500">System overview and configuration.</p>
      </div>

      {/* Entity cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-amber-200 hover:shadow-md"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.tint}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100" /> : (c.value ?? 0)}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Applications by status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Applications by Status</h3>
            </div>
            <Link href="/dashboard/staff/applications" className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : stats && Object.keys(stats.statusCounts).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(stats.statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const pct = stats.totalApplications > 0 ? Math.round((count / stats.totalApplications) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`w-44 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[status] || status}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-sm font-semibold text-slate-700">{count}</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No applications yet.</p>
          )}
        </div>

        {/* Revenue + totals */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-emerald-900">Verified Revenue</h3>
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {loading ? '…' : formatFee(stats?.verifiedRevenue ?? 0)}
            </p>
            <p className="mt-1 text-xs text-emerald-600">From verified payments</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Total Applications</h3>
            </div>
            <p className="text-2xl font-bold text-slate-900">{loading ? '…' : stats?.totalApplications ?? 0}</p>
            <p className="mt-1 text-xs text-slate-500">Excluding drafts</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
