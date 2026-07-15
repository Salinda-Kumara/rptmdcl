'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle2,
  Clock,
  Wallet,
  PlusCircle,
  ArrowRight,
  ArrowUpRight,
  Inbox,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { StudentShell } from '@/components/student/StudentShell';
import {
  applicationsApi,
  studentsApi,
  Application,
  STATUS_LABELS,
  STATUS_COLORS,
  formatFee,
  applicationTypeLabel,
} from '@/lib/applications-api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      applicationsApi.getMyApplications().then(setApplications).catch(() => {}),
      studentsApi.getProfile().then(setProfile).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const counts = {
    total: applications.length,
    approved: applications.filter((a) => a.status === 'APPROVED').length,
    pending: applications.filter((a) => !['APPROVED', 'REJECTED', 'PAYMENT_REJECTED', 'CANCELLED'].includes(a.status)).length,
    rejected: applications.filter((a) => ['REJECTED', 'PAYMENT_REJECTED'].includes(a.status)).length,
    draft: applications.filter((a) => a.status === 'DRAFT').length,
  };

  const recent = applications.slice(0, 5);
  // Greet with at least the first three words of the name (or the whole name if shorter).
  const firstName = (profile?.fullName || user?.name || 'Student').trim().split(/\s+/).slice(0, 3).join(' ');

  const stats = [
    {
      label: 'Total Applications',
      value: counts.total,
      icon: FileText,
      tint: 'from-blue-500 to-indigo-500',
      ring: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Approved',
      value: counts.approved,
      icon: CheckCircle2,
      tint: 'from-emerald-500 to-green-500',
      ring: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Pending Review',
      value: counts.pending,
      icon: Clock,
      tint: 'from-amber-500 to-orange-500',
      ring: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Rejected',
      value: counts.rejected,
      icon: XCircle,
      tint: 'from-rose-500 to-red-500',
      ring: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Draft Applications',
      value: counts.draft,
      icon: FileText,
      tint: 'from-violet-500 to-purple-500',
      ring: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <StudentShell>
      {/* Welcome banner */}
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-5 shadow-lg shadow-indigo-200 sm:mb-7 sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 right-20 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100">Welcome back,</p>
            <h1 className="mt-0.5 text-xl font-bold text-white sm:text-3xl">{firstName} 👋</h1>
            <p className="mt-1.5 text-sm text-blue-100">
              {profile?.batch?.programme?.name || 'Loading programme...'}
              {profile?.registrationNumber ? ` · ${profile.registrationNumber}` : ''}
            </p>
          </div>
          <Link
            href="/dashboard/student/applications/new"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-md transition-transform hover:scale-[1.02] hover:bg-blue-50"
          >
            <PlusCircle className="h-4 w-4" />
            New Application
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-7 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500">{s.label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                    {loading ? <span className="text-slate-300">—</span> : s.value}
                  </p>
                </div>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.ring}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${s.tint} opacity-0 transition-opacity group-hover:opacity-100`} />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent applications */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Recent Applications</h2>
              <Link
                href="/dashboard/student/applications"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
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
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Inbox className="h-7 w-7 text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">No applications yet</p>
                <p className="mt-1 text-sm text-slate-400">Create your first repeat or medical application.</p>
                <Link
                  href="/dashboard/student/applications/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <PlusCircle className="h-4 w-4" /> New Application
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((app) => (
                  <li key={app.id}>
                    <Link
                      href={`/dashboard/student/applications/${app.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:gap-4 sm:px-5 sm:py-4"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          app.type === 'MEDICAL' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {applicationTypeLabel(app)} Application
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {app.applicationSubjects.length} subject(s) · {formatFee(app.totalFee)} ·{' '}
                          {new Date(app.createdAt).toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Quick Actions</h2>
            <div className="space-y-2.5">
              <Link
                href="/dashboard/student/applications/new"
                className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-all hover:border-blue-300 hover:bg-blue-50/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <PlusCircle className="h-[18px] w-[18px]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">New Application</p>
                  <p className="text-xs text-slate-500">Repeat or medical</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
              </Link>

              <Link
                href="/dashboard/student/applications"
                className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-all hover:border-blue-300 hover:bg-blue-50/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <FileText className="h-[18px] w-[18px]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">My Applications</p>
                  <p className="text-xs text-slate-500">Track status & history</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
              </Link>

              <Link
                href="/dashboard/student/profile"
                className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-all hover:border-blue-300 hover:bg-blue-50/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">My Profile</p>
                  <p className="text-xs text-slate-500">View your details</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
              </Link>
            </div>
          </div>

          {/* Payment info card */}
          <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-900">Payment Details</h3>
            </div>
            <p className="mb-3 text-xs text-amber-700">
              Pay examination fees to this account before submitting.
            </p>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-amber-600">Bank</dt>
                <dd className="font-medium text-amber-900">Sampath Bank</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-amber-600">Branch</dt>
                <dd className="font-medium text-amber-900">Borella</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-amber-600">Account No</dt>
                <dd className="font-mono font-bold text-amber-900">000460002370</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
