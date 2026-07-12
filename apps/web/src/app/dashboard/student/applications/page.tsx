'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, PlusCircle, Inbox, Search, ChevronRight } from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { applicationsApi, Application, STATUS_LABELS, STATUS_COLORS, formatFee } from '@/lib/applications-api';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'REPEAT', label: 'Repeat' },
  { key: 'MEDICAL', label: 'Medical' },
];

export default function ApplicationsListPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    applicationsApi.getMyApplications()
      .then(setApplications)
      .finally(() => setLoading(false));
  }, []);

  const filtered = applications
    .filter((a) => (filter === 'ALL' ? true : a.type === filter))
    .filter((a) =>
      query.trim() === ''
        ? true
        : a.applicationSubjects.some((s) =>
            `${s.subject.code} ${s.subject.name}`.toLowerCase().includes(query.toLowerCase()),
          ),
    );

  const countFor = (key: string) =>
    key === 'ALL' ? applications.length : applications.filter((a) => a.type === key).length;

  return (
    <StudentShell>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="mt-1 text-sm text-slate-500">Track and manage your examination applications.</p>
        </div>
        <Link
          href="/dashboard/student/applications/new"
          className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          New Application
        </Link>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {countFor(f.key)}
              </span>
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by subject…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className="h-11 w-11 rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/4 rounded bg-slate-100" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100" />
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Inbox className="h-7 w-7 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {applications.length === 0 ? 'No applications yet' : 'No matching applications'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {applications.length === 0
              ? 'Create your first repeat or medical application.'
              : 'Try a different filter or search term.'}
          </p>
          {applications.length === 0 && (
            <Link
              href="/dashboard/student/applications/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4" /> New Application
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/student/applications/${app.id}`}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                  app.type === 'MEDICAL' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {app.type === 'MEDICAL' ? 'Medical' : 'Repeat'} Application
                  </p>
                  {app.serialNumber && (
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600">
                      #{app.serialNumber}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {STATUS_LABELS[app.status] || app.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {app.applicationSubjects.map((s) => `${s.subject.code} — ${s.subject.name}`).join(', ')}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(app.createdAt).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">{formatFee(app.totalFee)}</p>
                <p className="text-xs text-slate-400">{app.applicationSubjects.length} subject(s)</p>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
            </Link>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
