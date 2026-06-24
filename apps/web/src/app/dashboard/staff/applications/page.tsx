'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Search, Inbox, ChevronRight } from 'lucide-react';
import { StaffShell } from '@/components/staff/StaffShell';
import { staffApi, StaffApplication } from '@/lib/staff-api';
import { STATUS_LABELS, STATUS_COLORS, formatFee } from '@/lib/applications-api';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'PAYMENT_PENDING', label: 'Payment Pending' },
  { key: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'PAYMENT_REJECTED', label: 'Payment Rejected' },
];

export default function StaffApplicationsPage() {
  const [apps, setApps] = useState<StaffApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    staffApi
      .getApplications({ status: status || undefined, type: type || undefined, search: search.trim() || undefined })
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Reload when filters change (debounced for search)
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type, search]);

  return (
    <StaffShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
        <p className="mt-1 text-sm text-slate-500">Review and process examination applications.</p>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                status === f.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none"
          >
            <option value="">All types</option>
            <option value="REPEAT">Repeat</option>
            <option value="MEDICAL">Medical</option>
          </select>
          <div className="relative flex-1 lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, batch, reg. no…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
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
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Inbox className="h-7 w-7 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">No applications found</p>
          <p className="mt-1 text-sm text-slate-400">Try adjusting the filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/staff/applications/${app.id}`}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${app.type === 'MEDICAL' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{app.student?.fullName || 'Unknown'}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[app.status] || app.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {app.student?.registrationNumber} · {app.student?.batchNumber} · {app.type === 'MEDICAL' ? 'Medical' : 'Repeat'} · {app.applicationSubjects.length} subject(s)
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">{formatFee(app.totalFee)}</p>
                <p className="text-xs text-slate-400">
                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' }) : '—'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
            </Link>
          ))}
        </div>
      )}
    </StaffShell>
  );
}
