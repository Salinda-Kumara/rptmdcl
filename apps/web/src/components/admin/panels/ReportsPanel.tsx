'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Calendar, CalendarRange, FileSpreadsheet, FileText,
  Loader2, Inbox, FileClock, Wallet, CheckCircle2, XCircle, ExternalLink, Printer,
} from 'lucide-react';
import { staffApi, StaffApplication } from '@/lib/staff-api';
import { formatFee } from '@/lib/applications-api';
import { exportApplicationsExcel, exportApplicationsPdf } from '@/lib/export-applications';
import { printApplicationById, openBlankTab } from '@/lib/application-form-pdf';
import { useMyPermissions } from '@/lib/permissions';

type DateMode = 'single' | 'range';

const STATUS_OPTIONS = [
  { value: '',                 label: 'All statuses' },
  { value: 'SUBMITTED',        label: 'New (Submitted)' },
  { value: 'PAYMENT_PENDING',  label: 'Finance Pending' },
  { value: 'PAYMENT_VERIFIED', label: 'Approved' },
  { value: 'REJECTED',         label: 'Exam Rejected' },
  { value: 'PAYMENT_REJECTED', label: 'Finance Rejected' },
];

function stageOf(status: string) {
  switch (status) {
    case 'SUBMITTED':        return 'new';
    case 'PAYMENT_PENDING':  return 'finance';
    case 'PAYMENT_VERIFIED':
    case 'APPROVED':         return 'approved';
    case 'REJECTED':         return 'examRejected';
    case 'PAYMENT_REJECTED': return 'financeRejected';
    default:                 return 'other';
  }
}

export function ReportsPanel() {
  const { name: myName, email: myEmail } = useMyPermissions();
  const [mode, setMode] = useState<DateMode>('range');
  const [singleDate, setSingleDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const [rows, setRows] = useState<StaffApplication[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  // Card quick-filter (client-side view filter on the loaded set).
  const [cardFilter, setCardFilter] = useState<'all' | 'new' | 'finance' | 'approved' | 'rejected'>('all');
  const [printing, setPrinting] = useState<string | null>(null);

  const doPrint = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (printing) return;
    const win = openBlankTab(); // open synchronously to keep the user-gesture
    setPrinting(id);
    try {
      await printApplicationById(id, win, myName || myEmail || undefined);
    } catch (err) {
      console.error('Print failed', err);
    } finally {
      setPrinting(null);
    }
  };

  // Auto-load on mount and whenever filters change (debounced).
  const load = useCallback(async () => {
    setError('');
    const from = mode === 'single' ? singleDate : dateFrom;
    const to   = mode === 'single' ? singleDate : dateTo;
    if (mode === 'range' && dateFrom && dateTo && new Date(dateTo) < new Date(dateFrom)) {
      setError('End date cannot be before start date.');
      return;
    }
    setLoading(true);
    try {
      const data = await staffApi.getApplications({
        dateFrom: from   || undefined,
        dateTo:   to     || undefined,
        type:     type   || undefined,
        status:   status || undefined,
      });
      setRows(data);
    } catch {
      setError('Could not load the report data.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [mode, singleDate, dateFrom, dateTo, type, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const doExport = async (kind: 'excel' | 'pdf') => {
    if (displayRows.length === 0 || exporting) return;
    setExporting(kind);
    try {
      if (kind === 'excel') await exportApplicationsExcel(displayRows);
      else await exportApplicationsPdf(displayRows);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(null);
    }
  };

  // Summary
  const summary = React.useMemo(() => {
    const s = { total: 0, new: 0, finance: 0, approved: 0, examRejected: 0, financeRejected: 0, repeat: 0, medical: 0, revenue: 0 };
    for (const a of rows ?? []) {
      s.total++;
      const stage = stageOf(a.status);
      if (stage === 'new') s.new++;
      else if (stage === 'finance') s.finance++;
      else if (stage === 'approved') { s.approved++; s.revenue += a.totalFee ?? 0; }
      else if (stage === 'examRejected') s.examRejected++;
      else if (stage === 'financeRejected') s.financeRejected++;
      if (a.type === 'REPEAT') s.repeat++; else if (a.type === 'MEDICAL') s.medical++;
    }
    return s;
  }, [rows]);

  const fmtD = (d: string) => new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' });
  const rangeLabel = mode === 'single'
    ? (singleDate ? fmtD(singleDate) : 'All dates')
    : (!dateFrom && !dateTo)
      ? 'All dates'
      : `${dateFrom ? fmtD(dateFrom) : 'Beginning'} → ${dateTo ? fmtD(dateTo) : 'Today'}`;

  const cards = [
    { key: 'all',      label: 'Total',           value: summary.total,           icon: BarChart3,    tint: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',    ring: 'ring-indigo-400' },
    { key: 'new',      label: 'New',             value: summary.new,             icon: FileClock,    tint: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',        ring: 'ring-blue-400' },
    { key: 'finance',  label: 'Finance Pending', value: summary.finance,         icon: Wallet,       tint: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',    ring: 'ring-amber-400' },
    { key: 'approved', label: 'Approved',        value: summary.approved,        icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400', ring: 'ring-emerald-400' },
    { key: 'rejected', label: 'Rejected',        value: summary.examRejected + summary.financeRejected, icon: XCircle, tint: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400', ring: 'ring-red-400' },
  ] as const;

  // Rows shown/exported, after applying the active card quick-filter.
  const displayRows = (rows ?? []).filter((a) => {
    if (cardFilter === 'all') return true;
    const st = stageOf(a.status);
    if (cardFilter === 'rejected') return st === 'examRejected' || st === 'financeRejected';
    return st === cardFilter;
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-gray-100">
          <BarChart3 className="h-5 w-5 text-amber-500" /> Reports
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
          Generate application reports for a selected date or range, then export to Excel or PDF.
        </p>
      </div>

      {/* Filter bar — single compact row */}
      <div className="mb-4 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date mode toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 p-0.5">
            <button onClick={() => setMode('single')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                mode === 'single' ? 'bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-gray-400'
              }`}>
              <Calendar className="h-3.5 w-3.5" /> Single
            </button>
            <button onClick={() => setMode('range')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                mode === 'range' ? 'bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-gray-400'
              }`}>
              <CalendarRange className="h-3.5 w-3.5" /> Range
            </button>
          </div>

          {mode === 'single' ? (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">Date</label>
              <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-amber-400 focus:outline-none" />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">To</label>
                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-amber-400 focus:outline-none" />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-amber-400 focus:outline-none">
              <option value="">All types</option>
              <option value="REPEAT">Repeat</option>
              <option value="MEDICAL">Medical</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-amber-400 focus:outline-none">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {(singleDate || dateFrom || dateTo || type || status) && (
            <button
              onClick={() => { setSingleDate(''); setDateFrom(''); setDateTo(''); setType(''); setStatus(''); }}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          )}

          {loading && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
          {error && <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white dark:bg-gray-900" />)}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-white dark:bg-gray-900" />
        </div>
      ) : rows === null ? null : (
        <div>
          {/* Report header + export */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
                {rangeLabel} · {displayRows.length} application{displayRows.length !== 1 ? 's' : ''}
                {cardFilter !== 'all' && (
                  <button onClick={() => setCardFilter('all')}
                    className="ml-2 rounded-full bg-slate-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700">
                    {cards.find((c) => c.key === cardFilter)?.label} ✕
                  </button>
                )}
              </p>
              <p className="text-xs text-slate-400 dark:text-gray-600">
                Approved revenue: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatFee(summary.revenue)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => doExport('excel')} disabled={displayRows.length === 0 || exporting !== null}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm hover:bg-emerald-100 disabled:opacity-50 transition-colors">
                {exporting === 'excel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                Export Excel
              </button>
              <button onClick={() => doExport('pdf')} disabled={displayRows.length === 0 || exporting !== null}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-400 shadow-sm hover:bg-red-100 disabled:opacity-50 transition-colors">
                {exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Export PDF
              </button>
            </div>
          </div>

          {/* Summary cards — click to filter */}
          <div className="mb-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {cards.map((c) => {
              const Icon = c.icon;
              const active = cardFilter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCardFilter(active && c.key !== 'all' ? 'all' : c.key)}
                  className={`flex items-center gap-2.5 rounded-xl border bg-white dark:bg-gray-900 px-3 py-2.5 text-left shadow-sm transition-all hover:shadow-md ${
                    active
                      ? `border-transparent ring-2 ${c.ring}`
                      : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.tint}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none text-slate-900 dark:text-gray-100">{c.value}</p>
                    <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500 dark:text-gray-400">{c.label}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview table */}
          {displayRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-16 text-center">
              <Inbox className="h-8 w-8 text-slate-300 dark:text-gray-600" />
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                {cardFilter === 'all' ? 'No applications in this period' : `No ${cards.find((c) => c.key === cardFilter)?.label.toLowerCase()} applications`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60 text-left">
                    {['Serial No.', 'Reg. No.', 'Student', 'Type', 'Subjects', 'Fee', 'Status', 'Submitted', 'Remarks', ''].map((h, idx) => (
                      <th key={idx} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((a, i) => (
                    <tr key={a.id}
                      onClick={() => window.open(`/dashboard/staff/applications/${a.id}`, '_blank')}
                      className={`cursor-pointer border-t border-slate-100 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/50 dark:bg-gray-900/60'} hover:bg-amber-50/50 dark:hover:bg-amber-900/10`}>
                      <td className="px-4 py-2.5"><span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">{a.serialNumber || '—'}</span></td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-gray-400">{a.student?.registrationNumber || '—'}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-gray-200">{a.student?.fullName || '—'}</td>
                      <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.type === 'MEDICAL' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{a.type === 'MEDICAL' ? 'Medical' : 'Repeat'}</span></td>
                      <td className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-gray-400">{a.applicationSubjects?.length ?? 0}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-gray-300">{formatFee(a.totalFee)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-gray-400">{
                        stageOf(a.status) === 'approved' ? 'Approved'
                        : stageOf(a.status) === 'new' ? 'New'
                        : stageOf(a.status) === 'finance' ? 'Finance Pending'
                        : stageOf(a.status) === 'examRejected' ? 'Exam Rejected'
                        : stageOf(a.status) === 'financeRejected' ? 'Finance Rejected'
                        : a.status
                      }</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 dark:text-gray-600">{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td className="max-w-[220px] px-4 py-2.5 text-xs text-slate-500 dark:text-gray-400">
                        {a.remarks && a.remarks.length > 0
                          ? <span className="line-clamp-2" title={a.remarks.map((r) => r.content).join(' | ')}>{a.remarks.map((r) => r.content).join(' | ')}</span>
                          : <span className="text-slate-300 dark:text-gray-700">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => doPrint(a.id, e)}
                            disabled={printing !== null}
                            title="Print application form + attachments"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 disabled:opacity-40 transition-colors"
                          >
                            {printing === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                          </button>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-300 dark:text-gray-600" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
