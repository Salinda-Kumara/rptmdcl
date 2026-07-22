'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollText, RefreshCw, Search, ChevronLeft, ChevronRight, Inbox,
  Filter, X, Download, Loader2,
} from 'lucide-react';
import { logsApi, ActionLog } from '@/lib/logs-api';
import { exportLogsExcel } from '@/lib/export-logs';

// Human-readable "what happened" for each recorded action code.
const ACTION_LABELS: Record<string, string> = {
  'application.create':            'Created application',
  'application.submit':            'Submitted application',
  'application.resubmit':          'Resubmitted application',
  'application.cancel':            'Cancelled application',
  'application.exam_review':       'Exam Division review',
  'application.subject_decline':   'Declined a subject',
  'application.payment_review':    'Finance payment review',
  'application.final_approve':     'Final approval',
  'application.final_approve_bulk':'Bulk final approval',
  'application.final_reject':      'Final rejection',
  'application.rollback':          'Rolled back status',
  'application.admission_printed': 'Marked admission printed',
  'document.upload':               'Uploaded document',
  'document.delete':               'Deleted document',
  'auth.login':                    'Signed in',
  'auth.password_reset_request':   'Requested password reset',
  'auth.password_reset_verify':    'Verified reset code',
  'auth.password_reset':           'Reset password',
  'user.create':                   'Created staff user',
  'user.update':                   'Updated staff user',
  'user.delete':                   'Deleted staff user',
  'user.activate':                 'Reactivated staff user',
  'schedule.publish':              'Published exam schedule',
  'schedule.unpublish':            'Unpublished exam schedule',
  'schedule.apply_toggle':         'Toggled applications open/closed',
  'schedule.import':               'Imported exam timetable',
  'scheduled_exam.create':         'Added an exam to a schedule',
  'student.import':                'Imported students',
  'student_profile.update':        'Updated own profile',
  // Legacy codes from before the interceptor was updated.
  'document.post':                 'Uploaded document',
  'user.post':                     'Created staff user',
  'user.patch':                    'Updated staff user',
};

// Verb (last code segment) → past-tense word for the fallback label.
const VERB_WORD: Record<string, string> = {
  create: 'Created', update: 'Updated', delete: 'Deleted',
  post: 'Created', patch: 'Updated', put: 'Updated',
};
// Resource (segment before the verb) → readable noun.
const RESOURCE_WORD: Record<string, string> = {
  user: 'staff user', programme: 'programme', subject: 'subject', batch: 'batch',
  schedule: 'exam schedule', scheduled_exam: 'exam timetable row',
  exam_staff: 'exam staff', exam_location: 'exam location', student: 'student',
  application: 'application', document: 'document',
};

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  // Fallback for unmapped codes (incl. old ones): treat the LAST segment as the
  // verb and the one before it as the resource, so nothing shows raw "post/patch".
  const parts = action.split('.');
  const v = parts[parts.length - 1];
  const res = parts[parts.length - 2] ?? '';
  if (VERB_WORD[v]) {
    const noun = RESOURCE_WORD[res] ?? res.replace(/[-_]/g, ' ');
    return `${VERB_WORD[v]}${noun ? ` ${noun}` : ''}`;
  }
  const nice = action.replace(/[._]/g, ' ').trim();
  return nice.charAt(0).toUpperCase() + nice.slice(1);
}

// A full sentence describing what happened, for the Description column.
function describeLog(l: ActionLog): string {
  let s = actionLabel(l.action);
  if (l.entity === 'application' && l.entity_ref) s += ` — application ${l.entity_ref}`;
  if (!l.success) s += ` · failed${l.status_code ? ` (${l.status_code})` : ''}`;
  return s;
}

// Best-effort actor label for the User column.
function userLabel(l: ActionLog): string {
  return l.user_name || l.user_email || (l.action === 'auth.login' ? 'Unknown (failed sign-in)' : 'System');
}

interface Props { serial?: string }

export function LogsPanel({ serial: initialSerial }: Props) {
  const [items, setItems] = useState<ActionLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [serial, setSerial] = useState(initialSerial || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    logsApi
      .list({ search, action, serial, dateFrom, dateTo, page, pageSize })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, action, serial, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { logsApi.actions().then(setActionOptions).catch(() => {}); }, []);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1); }, [search, action, serial, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const anyFilter = !!(search || action || serial || dateFrom || dateTo);
  const clearAll = () => { setSearch(''); setAction(''); setSerial(initialSerial || ''); setDateFrom(''); setDateTo(''); };

  // Export the CURRENT filter selection (all matching rows, not just this page).
  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const all: ActionLog[] = [];
      const size = 200;
      for (let p = 1; p <= 200; p++) { // hard cap 40k rows
        const r = await logsApi.list({ search, action, serial, dateFrom, dateTo, page: p, pageSize: size });
        all.push(...r.items);
        if (r.items.length === 0 || all.length >= r.total) break;
      }
      const rows = all.map((l) => ({
        time: new Date(l.created_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }),
        user: userLabel(l),
        email: l.user_email || '',
        action: actionLabel(l.action),
        description: describeLog(l),
        application: l.entity_ref || '',
        method: l.method,
        route: l.route,
        status: l.status_code != null ? String(l.status_code) : l.success ? 'OK' : 'Error',
        ip: l.ip_address || '',
      }));
      const parts = [
        search && `search "${search}"`,
        action && `action ${actionLabel(action)}`,
        serial && `application ${serial}`,
        dateFrom && `from ${dateFrom}`,
        dateTo && `to ${dateTo}`,
      ].filter(Boolean);
      await exportLogsExcel(rows, { filterNote: parts.length ? parts.join(', ') : 'All logs' });
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">Activity Logs</h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
              Every action is recorded to a separate logs database. Filter by application, user, action or date.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} disabled={exporting || loading || total === 0}
            title="Export the current filter selection to Excel"
            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
          <button onClick={load}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email, route, action…"
            className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs shadow-sm focus:border-amber-400 focus:outline-none" />
        </div>

        <div className="relative">
          <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Application Serial No"
            className="w-48 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs shadow-sm focus:border-amber-400 focus:outline-none" />
        </div>

        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:outline-none">
          <option value="">All actions</option>
          {actionOptions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>

        <div className="flex items-center gap-1">
          <label className="text-[10px] font-medium text-slate-400">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:outline-none" />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[10px] font-medium text-slate-400">To</label>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:outline-none" />
        </div>

        {anyFilter && (
          <button onClick={clearAll}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <span className="ml-auto text-[10px] text-slate-400">{loading ? '…' : `${total} record${total !== 1 ? 's' : ''}`}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-20 text-center">
          <Inbox className="h-10 w-10 text-slate-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">No log entries</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-gray-600">
            {anyFilter ? 'Try adjusting the filters.' : 'Actions will appear here as they happen.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60 text-left">
                {['Time', 'User', 'Action', 'Description', 'Application', 'IP Address'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((l, i) => (
                <tr key={l.id} className={`border-t border-slate-100 dark:border-gray-800 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/50 dark:bg-gray-900/60'}`}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500 dark:text-gray-400">
                    {new Date(l.created_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-800 dark:text-gray-200">{userLabel(l)}</p>
                    {l.user_name && l.user_email && <p className="text-[10px] text-slate-400">{l.user_email}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5" title={l.action}>
                    <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">{actionLabel(l.action)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-gray-400">{describeLog(l)}</td>
                  <td className="px-4 py-2.5">
                    {l.entity_ref ? (
                      <button onClick={() => setSerial(l.entity_ref!)}
                        title="Filter by this application"
                        className="font-mono text-[11px] font-semibold text-amber-700 hover:underline">
                        {l.entity_ref}
                      </button>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-slate-500 dark:text-gray-400">
                    {l.ip_address || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-40">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
