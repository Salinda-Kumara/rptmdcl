'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Inbox, RefreshCw, Search, ClipboardList, ShieldAlert, XCircle,
  Wallet, CheckCircle2, BadgeCheck, ClipboardCheck, FileClock, ChevronRight,
  FileSpreadsheet, FileText, Loader2,
} from 'lucide-react';
import { staffApi, StaffApplication } from '@/lib/staff-api';
import { formatFee, applicationTypeLabel, fmtDateTime } from '@/lib/applications-api';
import { useMyPermissions } from '@/lib/permissions';
import { exportApplicationsExcel, exportApplicationsPdf } from '@/lib/export-applications';

interface Props { onNavigate: (view: string, id?: string) => void; }

type FinanceTab = 'pending' | 'approved' | 'rejected';
const FINANCE_TABS: { key: FinanceTab; label: string; status: string; icon: React.ComponentType<{ className?: string }>; tint: string }[] = [
  { key: 'pending',  label: 'To Verify',        status: 'PAYMENT_PENDING',  icon: Wallet,       tint: 'text-amber-700' },
  { key: 'approved', label: 'Verified',          status: 'PAYMENT_VERIFIED', icon: CheckCircle2, tint: 'text-emerald-700' },
  { key: 'rejected', label: 'Rejected',          status: 'PAYMENT_REJECTED', icon: XCircle,      tint: 'text-red-700' },
];

type ColKey = 'ex-new' | 'ex-verified' | 'ex-rejected' | 'fi-pending' | 'fi-verified' | 'fi-rejected' | 'approved';

interface SubCol {
  key: ColKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subBg: string; subText: string;
  cellBg: string;
  dot: string; cardBg: string; cardBorder: string; cardText: string;
}

const COLS: SubCol[] = [
  { key: 'ex-new',      label: 'Pending',  icon: FileClock,    subBg: 'bg-blue-50',    subText: 'text-blue-600',    cellBg: 'bg-blue-50/30',    dot: 'bg-blue-500',    cardBg: 'bg-blue-50',    cardBorder: 'border-blue-200',    cardText: 'text-blue-700' },
  { key: 'ex-verified', label: 'Verified', icon: CheckCircle2, subBg: 'bg-sky-50',     subText: 'text-sky-600',     cellBg: 'bg-sky-50/30',     dot: 'bg-sky-500',     cardBg: 'bg-sky-50',     cardBorder: 'border-sky-200',     cardText: 'text-sky-700' },
  { key: 'ex-rejected', label: 'Rejected', icon: ShieldAlert,  subBg: 'bg-orange-50',  subText: 'text-orange-600',  cellBg: 'bg-orange-50/30',  dot: 'bg-orange-400',  cardBg: 'bg-orange-50',  cardBorder: 'border-orange-200',  cardText: 'text-orange-700' },
  { key: 'fi-pending',  label: 'Pending',  icon: Wallet,       subBg: 'bg-amber-50',   subText: 'text-amber-600',   cellBg: 'bg-amber-50/30',   dot: 'bg-amber-500',   cardBg: 'bg-amber-50',   cardBorder: 'border-amber-200',   cardText: 'text-amber-700' },
  { key: 'fi-verified', label: 'Verified', icon: CheckCircle2, subBg: 'bg-emerald-50', subText: 'text-emerald-600', cellBg: 'bg-emerald-50/30', dot: 'bg-emerald-500', cardBg: 'bg-emerald-50', cardBorder: 'border-emerald-200', cardText: 'text-emerald-700' },
  { key: 'fi-rejected', label: 'Rejected', icon: XCircle,      subBg: 'bg-red-50',     subText: 'text-red-600',     cellBg: 'bg-red-50/30',     dot: 'bg-red-400',     cardBg: 'bg-red-50',     cardBorder: 'border-red-200',     cardText: 'text-red-700' },
  { key: 'approved',    label: 'Approved', icon: BadgeCheck,   subBg: 'bg-teal-50',    subText: 'text-teal-600',    cellBg: 'bg-teal-50/30',    dot: 'bg-teal-500',    cardBg: 'bg-teal-50',    cardBorder: 'border-teal-200',    cardText: 'text-teal-700' },
];

function getActiveCol(status: string): ColKey {
  switch (status) {
    case 'SUBMITTED':        return 'ex-new';
    case 'PAYMENT_PENDING':  return 'fi-pending';
    // Payment verified by Finance but not yet given final approval by the Exam
    // Registrar — sits in the Finance "Verified" column, not Approved.
    case 'PAYMENT_VERIFIED': return 'fi-verified';
    case 'PAYMENT_REJECTED': return 'fi-rejected';
    case 'REJECTED':         return 'ex-rejected';
    case 'APPROVED':         return 'approved';
    default:                 return 'ex-new';
  }
}

const DONE_BEFORE: Record<ColKey, ColKey[]> = {
  'ex-new':      [],
  'ex-verified': ['ex-new'],
  'ex-rejected': ['ex-new'],
  'fi-pending':  ['ex-new', 'ex-verified'],
  'fi-verified': ['ex-new', 'ex-verified', 'fi-pending'],
  'fi-rejected': ['ex-new', 'ex-verified', 'fi-pending'],
  'approved':    ['ex-new', 'ex-verified', 'fi-pending', 'fi-verified'],
};

type Tab = 'new' | 'finance' | 'registrar' | 'approved' | 'all';

export function ApplicationsPanel({ onNavigate }: Props) {
  const { isAdmin, permissions } = useMyPermissions();
  // Finance officers (payments access, not full application reviewers) get a
  // focused view: only applications the Exam Division forwarded for payment
  // verification, split into To Verify / Approved / Rejected.
  const isFinanceOnly = !isAdmin && permissions.applications !== 'FULL' && !!permissions.payments;
  // Exam Registrars (final-approval access, but not application reviewers or
  // finance) land straight on the "Awaiting Final Approval" queue.
  const isApproverFocused =
    !isAdmin && permissions.applications !== 'FULL' && !permissions.payments && !!permissions.approvals;
  const [financeTab, setFinanceTab] = useState<FinanceTab>('pending');

  const [tab, setTab] = useState<Tab>('new');
  // Apply the approver's default tab once, without overriding later manual switches.
  const defaultedTab = useRef(false);
  useEffect(() => {
    if (!defaultedTab.current && isApproverFocused) {
      defaultedTab.current = true;
      setTab('registrar');
    }
  }, [isApproverFocused]);
  const [all, setAll] = useState<StaffApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serialSort, setSerialSort] = useState<'asc' | 'desc' | null>(null);
  // All-tab column filter: a specific stage (ColKey) or a whole group ('ex' | 'fi').
  const [colFilter, setColFilter] = useState<ColKey | 'ex' | 'fi' | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  // Final-approval bulk / per-row actions (Awaiting Final Approval tab).
  const canFinalApprove = isAdmin || permissions.approvals === 'FULL';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    staffApi.getApplications({
      dateFrom: dateFrom || undefined,
      dateTo:   dateTo   || undefined,
    }).then(setAll).catch(() => {}).finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // Reset final-approval selection/reject state when leaving the registrar tab.
  useEffect(() => {
    if (tab !== 'registrar') { setSelected(new Set()); setRejectFor(null); setRejectRemark(''); setActionError(''); }
  }, [tab]);

  const filtered = all.filter((app) => {
    if (typeFilter && app.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        app.student?.fullName.toLowerCase().includes(q) ||
        app.student?.registrationNumber.toLowerCase().includes(q) ||
        (app.student?.batchNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // All-tab rows: filter to the clicked stage/group column, if any.
  const matchesColFilter = (app: StaffApplication) => {
    if (!colFilter) return true;
    const k = getActiveCol(app.status);
    if (colFilter === 'ex') return k.startsWith('ex');
    if (colFilter === 'fi') return k.startsWith('fi');
    return k === colFilter;
  };
  const allSorted = filtered.filter(matchesColFilter);

  // Toggle the All-tab column filter (click again on the same column to clear).
  const handleColFilter = (col: ColKey | 'ex' | 'fi') => {
    setColFilter((cur) => (cur === col ? null : col));
  };

  const handleExport = async (kind: 'excel' | 'pdf') => {
    if (exporting) return;
    setExporting(kind);
    try {
      if (kind === 'excel') await exportApplicationsExcel(allSorted);
      else await exportApplicationsPdf(allSorted);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(null);
    }
  };

  // ── Final-approval actions ──────────────────────────────────────────────
  const clearActionState = () => { setSelected(new Set()); setRejectFor(null); setRejectRemark(''); setActionError(''); };
  const toggleSel = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelAll = (rows: StaffApplication[]) =>
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const doBulkApprove = async () => {
    if (selected.size === 0 || bulkBusy) return;
    setBulkBusy(true); setActionError('');
    try {
      await staffApi.finalApproveBulk([...selected]);
      clearActionState(); load();
    } catch (e: any) {
      setActionError(e.response?.data?.message?.toString() || 'Bulk approval failed');
    } finally { setBulkBusy(false); }
  };
  const doRowApprove = async (id: string) => {
    if (rowBusy) return;
    setRowBusy(id); setActionError('');
    try {
      await staffApi.finalApprove(id);
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      load();
    } catch (e: any) {
      setActionError(e.response?.data?.message?.toString() || 'Approval failed');
    } finally { setRowBusy(null); }
  };
  const doRowReject = async (id: string) => {
    if (rowBusy || !rejectRemark.trim()) return;
    setRowBusy(id); setActionError('');
    try {
      await staffApi.finalReject(id, rejectRemark.trim());
      clearActionState(); load();
    } catch (e: any) {
      setActionError(e.response?.data?.message?.toString() || 'Rejection failed');
    } finally { setRowBusy(null); }
  };

  // Applications that map to the Approved column (PAYMENT_VERIFIED + APPROVED).
  const approvedApps = filtered.filter((a) => getActiveCol(a.status) === 'approved');

  const cnt = { ex: 0, fi: 0, ap: 0 };
  for (const app of filtered) {
    const k = getActiveCol(app.status);
    if (k.startsWith('ex')) cnt.ex++;
    else if (k.startsWith('fi')) cnt.fi++;
    else cnt.ap++;
  }

  const sortBySerial = (arr: StaffApplication[]) =>
    serialSort
      ? [...arr].sort((a, b) => {
          const sa = a.serialNumber ?? '';
          const sb = b.serialNumber ?? '';
          return serialSort === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
        })
      : arr;

  const newApps = sortBySerial(filtered.filter((a) => a.status === 'SUBMITTED'));
  // Finance Pending — forwarded to Finance and awaiting payment verification.
  const financeApps = sortBySerial(filtered.filter((a) => a.status === 'PAYMENT_PENDING'));
  // Awaiting Final Approval — payment verified, awaiting the Exam Registrar.
  const registrarApps = sortBySerial(filtered.filter((a) => a.status === 'PAYMENT_VERIFIED'));
  // Approved — payment verified / application approved (same grouping as the All-tab "Approved" column).
  const approvedList = sortBySerial(approvedApps);

  /* ──────────────── Finance-only focused view ──────────────── */
  if (isFinanceOnly) {
    const rows = filtered.filter((a) => a.status === FINANCE_TABS.find((t) => t.key === financeTab)!.status);
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">Payment Verification</h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">Applications forwarded by the Exam Division for payment verification.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, reg. no…"
                className="w-44 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs shadow-sm focus:border-indigo-400 focus:outline-none" />
            </div>
            <button onClick={load} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Finance tabs */}
        <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 p-1 w-fit">
          {FINANCE_TABS.map((t) => {
            const Icon = t.icon;
            const count = filtered.filter((a) => a.status === t.status).length;
            const active = financeTab === t.key;
            return (
              <button key={t.key} onClick={() => setFinanceTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  active ? `bg-white dark:bg-gray-700 ${t.tint} shadow-sm` : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
                }`}>
                <Icon className="h-4 w-4" />
                {t.label}
                {!loading && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-slate-100 dark:bg-gray-600' : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Date filter — same as the Admin "Applications" view */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 shrink-0">Filter by date:</span>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-slate-400 dark:text-gray-600">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-slate-400 dark:text-gray-600">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="ml-1 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          )}
          {(dateFrom || dateTo) && !loading && (
            <span className="ml-auto text-[10px] text-slate-400 dark:text-gray-600">
              {rows.length} result{rows.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-8 w-8 rounded-lg bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-3 w-1/3 rounded bg-slate-100" /><div className="h-2.5 w-1/2 rounded bg-slate-100" /></div>
            </div>))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-20 text-center">
            <Inbox className="h-10 w-10 text-slate-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">
              {financeTab === 'pending' ? 'No applications awaiting payment verification' : financeTab === 'approved' ? 'No approved payments yet' : 'No rejected payments'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Serial No.</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Registration No.</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Student</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Type</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 text-right">Fee</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Payment Ref</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((app, i) => (
                  <tr key={app.id} onClick={() => onNavigate('app-detail', app.id)}
                    className={`cursor-pointer border-t border-slate-100 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/50 dark:bg-gray-900/60'} hover:bg-amber-50/50 dark:hover:bg-amber-900/10`}>
                    <td className="px-4 py-3"><span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">{app.serialNumber || '—'}</span></td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-gray-300">{app.student?.registrationNumber || '—'}</td>
                    <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900 dark:text-gray-100">{app.student?.fullName || '—'}</p><p className="text-[10px] text-slate-400 dark:text-gray-600">{app.student?.batchNumber}</p></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${app.type === 'MEDICAL' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{applicationTypeLabel(app)}</span></td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-800 dark:text-gray-200">{formatFee(app.totalFee)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-gray-400">{app.paymentReferenceId || '—'}</td>
                    <td className="px-4 py-3 text-slate-300"><ChevronRight className="h-4 w-4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Shared list-table used by the New / Finance Pending / Approved tabs.
  const renderAppTable = (rows: StaffApplication[], hoverClass: string, emptyLabel: string) => {
    if (loading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-8 w-8 rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-slate-100" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-20 text-center">
          <Inbox className="h-10 w-10 text-slate-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">{emptyLabel}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-gray-600">
            {search || typeFilter ? 'Try adjusting the filters.' : ''}
          </p>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60 text-left">
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 w-8">#</th>
              <th className="px-4 py-2.5">
                <button
                  onClick={() => setSerialSort((s) => s === 'asc' ? 'desc' : s === 'desc' ? null : 'asc')}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Serial No.
                  <span className="flex flex-col leading-none text-[8px]">
                    <span className={serialSort === 'asc' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-gray-700'}>▲</span>
                    <span className={serialSort === 'desc' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-gray-700'}>▼</span>
                  </span>
                </button>
              </th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Registration No.</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Student</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Type</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 text-center">Subjects</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 text-right">Fee</th>
              <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Submitted</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((app, i) => (
              <tr key={app.id}
                onClick={() => onNavigate('app-detail', app.id)}
                className={`cursor-pointer border-t border-slate-100 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/50 dark:bg-gray-900/60'} ${hoverClass}`}>
                <td className="px-4 py-3 text-center">
                  <span className="flex h-5 w-5 mx-auto items-center justify-center rounded bg-slate-700 dark:bg-gray-600 text-[9px] font-bold text-white">{i + 1}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    {app.serialNumber || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-gray-300">
                  {app.student?.registrationNumber || '—'}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">{app.student?.fullName || '—'}</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-600">{app.student?.batchNumber}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    app.type === 'MEDICAL' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {applicationTypeLabel(app)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-gray-300">
                  {app.applicationSubjects?.length ?? 0}
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-slate-800 dark:text-gray-200">
                  {formatFee(app.totalFee)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 dark:text-gray-600">
                  {fmtDateTime(app.submittedAt)}
                </td>
                <td className="pr-3 text-slate-300 dark:text-gray-600">
                  <ChevronRight className="h-4 w-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Awaiting Final Approval — select-all + bulk approve, and per-row approve/reject.
  const renderRegistrarTable = (rows: StaffApplication[]) => {
    if (loading) return renderAppTable(rows, '', '');
    if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-20 text-center">
          <Inbox className="h-10 w-10 text-slate-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">No applications awaiting final approval</p>
        </div>
      );
    }
    const allSelected = selected.size === rows.length;
    return (
      <div className="space-y-3">
        {actionError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700"><XCircle className="h-4 w-4 shrink-0" /> {actionError}</div>
        )}
        {/* Bulk action bar */}
        {canFinalApprove && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={allSelected} onChange={() => toggleSelAll(rows)}
                className="h-4 w-4 accent-emerald-600" />
              Select all ({rows.length})
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">{selected.size} selected</span>
              <button
                onClick={doBulkApprove}
                disabled={selected.size === 0 || bulkBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve selected
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60 text-left">
                {canFinalApprove && (
                  <th className="px-4 py-2.5 w-8">
                    <input type="checkbox" checked={allSelected} onChange={() => toggleSelAll(rows)} className="h-4 w-4 accent-emerald-600" />
                  </th>
                )}
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Serial No.</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Registration No.</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Student</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Type</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 text-center">Subjects</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 text-right">Fee</th>
                {canFinalApprove && <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Actions</th>}
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((app, i) => {
                const on = selected.has(app.id);
                const rejecting = rejectFor === app.id;
                return (
                  <React.Fragment key={app.id}>
                    <tr onClick={() => onNavigate('app-detail', app.id)}
                      className={`cursor-pointer border-t border-slate-100 dark:border-gray-800 transition-colors ${on ? 'bg-emerald-50/50' : i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/50 dark:bg-gray-900/60'} hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10`}>
                      {canFinalApprove && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={on} onChange={() => toggleSel(app.id)} className="h-4 w-4 accent-emerald-600" />
                        </td>
                      )}
                      <td className="px-4 py-3"><span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">{app.serialNumber || '—'}</span></td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-gray-300">{app.student?.registrationNumber || '—'}</td>
                      <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900 dark:text-gray-100">{app.student?.fullName || '—'}</p><p className="text-[10px] text-slate-400 dark:text-gray-600">{app.student?.batchNumber}</p></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${app.type === 'MEDICAL' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{applicationTypeLabel(app)}</span></td>
                      <td className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-gray-300">{app.applicationSubjects?.length ?? 0}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-800 dark:text-gray-200">{formatFee(app.totalFee)}</td>
                      {canFinalApprove && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => doRowApprove(app.id)}
                              disabled={rowBusy !== null}
                              title="Approve"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {rowBusy === app.id && !rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectFor(rejecting ? null : app.id); setRejectRemark(''); setActionError(''); }}
                              disabled={rowBusy !== null}
                              title="Reject"
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="pr-3 text-slate-300 dark:text-gray-600"><ChevronRight className="h-4 w-4" /></td>
                    </tr>
                    {rejecting && canFinalApprove && (
                      <tr className="bg-red-50/40">
                        <td colSpan={canFinalApprove ? 9 : 8} className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <label className="mb-1 block text-xs font-semibold text-red-700">Reason for rejecting {app.serialNumber || 'this application'} <span className="text-red-500">*</span></label>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={rejectRemark}
                              onChange={(e) => setRejectRemark(e.target.value)}
                              autoFocus
                              placeholder="Explain why this application is being rejected…"
                              className="min-w-[240px] flex-1 rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                            />
                            <button
                              onClick={() => doRowReject(app.id)}
                              disabled={rowBusy !== null || !rejectRemark.trim()}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {rowBusy === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                              Confirm Rejection
                            </button>
                            <button
                              onClick={() => { setRejectFor(null); setRejectRemark(''); }}
                              disabled={rowBusy !== null}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">Applications</h1>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:outline-none">
            <option value="">All types</option>
            <option value="REPEAT">Repeat</option>
            <option value="MEDICAL">Medical</option>
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, reg. no…"
              className="w-44 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs shadow-sm focus:border-indigo-400 focus:outline-none" />
          </div>
          <button onClick={load}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Date filter bar (shared across all tabs) ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 shrink-0">Filter by date:</span>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-slate-400 dark:text-gray-600">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-slate-400 dark:text-gray-600">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-gray-300 shadow-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="ml-1 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          )}

          {/* Export buttons — All tab only */}
          {tab === 'all' && (
            <div className="ml-auto flex items-center gap-2">
              {colFilter && (
                <button
                  onClick={() => setColFilter(null)}
                  title="Clear column filter"
                  className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  Filtered: {
                    colFilter === 'ex' ? 'Exam Division'
                      : colFilter === 'fi' ? 'Finance'
                      : colFilter === 'approved' ? 'Approved'
                      : `${colFilter.startsWith('ex') ? 'Exam' : 'Finance'} · ${COLS.find((c) => c.key === colFilter)?.label ?? colFilter}`
                  }
                  <XCircle className="h-3 w-3" />
                </button>
              )}
              <span className="text-[10px] text-slate-400 dark:text-gray-600">
                {loading ? '…' : `${allSorted.length} record${allSorted.length !== 1 ? 's' : ''}`}
              </span>
              <button
                onClick={() => handleExport('excel')}
                disabled={loading || allSorted.length === 0 || exporting !== null}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-950/50 disabled:opacity-50 transition-colors"
              >
                {exporting === 'excel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={loading || allSorted.length === 0 || exporting !== null}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 shadow-sm hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50 transition-colors"
              >
                {exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                PDF
              </button>
            </div>
          )}
        </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 p-1 w-fit">
        <button
          onClick={() => setTab('new')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'new'
              ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
          }`}
        >
          <FileClock className="h-4 w-4" />
          New Applications
          {!loading && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              tab === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
            }`}>
              {newApps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('finance')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'finance'
              ? 'bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-400 shadow-sm'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
          }`}
        >
          <Wallet className="h-4 w-4" />
          Finance Pending
          {!loading && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              tab === 'finance' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
            }`}>
              {financeApps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('registrar')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'registrar'
              ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Awaiting Final Approval
          {!loading && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              tab === 'registrar' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
            }`}>
              {registrarApps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('approved')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'approved'
              ? 'bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-400 shadow-sm'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
          }`}
        >
          <BadgeCheck className="h-4 w-4" />
          Approved
          {!loading && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              tab === 'approved' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
            }`}>
              {approvedList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            tab === 'all'
              ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          All
          {!loading && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              tab === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
            }`}>
              {filtered.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab: New Applications ── */}
      {tab === 'new' && renderAppTable(newApps, 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10', 'No new applications')}

      {/* ── Tab: Finance Pending ── */}
      {tab === 'finance' && renderAppTable(financeApps, 'hover:bg-amber-50/50 dark:hover:bg-amber-900/10', 'No applications pending payment verification')}

      {/* ── Tab: Awaiting Final Approval ── */}
      {tab === 'registrar' && renderRegistrarTable(registrarApps)}

      {/* ── Tab: Approved ── */}
      {tab === 'approved' && renderAppTable(approvedList, 'hover:bg-teal-50/50 dark:hover:bg-teal-900/10', 'No approved applications yet')}

      {/* ── Tab: All (status table) ── */}
      {tab === 'all' && (
      <div className="rounded-xl border border-slate-200 shadow-sm" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
        <table className="w-full border-collapse bg-white text-xs">
          <thead className="sticky top-0 z-20">

            {/* Group row */}
            <tr>
              <th rowSpan={2} className="w-8 border-b border-slate-300 bg-slate-800 p-0">
                <span className="text-[9px] font-bold text-slate-400">#</span>
              </th>

              {/* Info columns */}
              <th rowSpan={2} className="border-b border-slate-200 bg-slate-700 p-0">
                <button
                  onClick={() => setSerialSort((s) => s === 'asc' ? 'desc' : s === 'desc' ? null : 'asc')}
                  className="flex w-full items-center justify-center gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white/90 hover:text-white transition-colors"
                >
                  Serial No.
                  <span className="flex flex-col leading-none text-[7px]">
                    <span className={serialSort === 'asc' ? 'text-white' : 'text-white/30'}>▲</span>
                    <span className={serialSort === 'desc' ? 'text-white' : 'text-white/30'}>▼</span>
                  </span>
                </button>
              </th>
              <th rowSpan={2} className="border-b border-slate-200 bg-slate-700 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white/90">Registration No.</th>
              <th rowSpan={2} className="border-b border-slate-200 bg-slate-700 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white/90">Type</th>
              <th rowSpan={2} className="border-b border-slate-200 bg-slate-700 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-white/90">Subjects</th>
              <th rowSpan={2} className="border-b border-r-2 border-r-slate-300 bg-slate-700 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white/90">Submitted</th>

              {/* Exam Division */}
              <th colSpan={3} className={`border-b border-r-2 border-r-slate-300 bg-blue-700 p-0 ${colFilter === 'ex' ? 'ring-2 ring-inset ring-white' : ''}`}>
                <button
                  onClick={() => handleColFilter('ex')}
                  title={colFilter === 'ex' ? 'Clear Exam Division filter' : 'Filter by Exam Division'}
                  className="flex w-full items-center justify-center gap-1.5 px-3 py-2 transition-opacity hover:opacity-90"
                >
                  <ClipboardList className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-xs font-bold text-white">Exam Division</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">{loading ? '…' : cnt.ex}</span>
                  {colFilter === 'ex' && <XCircle className="h-3.5 w-3.5 text-white" />}
                </button>
              </th>

              {/* Finance */}
              <th colSpan={3} className={`border-b border-r-2 border-r-slate-300 bg-amber-600 p-0 ${colFilter === 'fi' ? 'ring-2 ring-inset ring-white' : ''}`}>
                <button
                  onClick={() => handleColFilter('fi')}
                  title={colFilter === 'fi' ? 'Clear Finance filter' : 'Filter by Finance'}
                  className="flex w-full items-center justify-center gap-1.5 px-3 py-2 transition-opacity hover:opacity-90"
                >
                  <Wallet className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-xs font-bold text-white">Finance</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">{loading ? '…' : cnt.fi}</span>
                  {colFilter === 'fi' && <XCircle className="h-3.5 w-3.5 text-white" />}
                </button>
              </th>

              {/* Approved */}
              <th rowSpan={2} className={`border-b border-slate-200 bg-teal-600 p-0 ${colFilter === 'approved' ? 'ring-2 ring-inset ring-white' : ''}`}>
                <button
                  onClick={() => handleColFilter('approved')}
                  title={colFilter === 'approved' ? 'Clear Approved filter' : 'Filter by Approved'}
                  className="flex w-full items-center justify-center gap-1.5 px-3 py-2 transition-opacity hover:opacity-90"
                >
                  <BadgeCheck className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-xs font-bold text-white">Approved</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">{loading ? '…' : cnt.ap}</span>
                  {colFilter === 'approved' && <XCircle className="h-3.5 w-3.5 text-white" />}
                </button>
              </th>

              <th rowSpan={2} className="w-6 border-b border-slate-200 bg-slate-800 p-0" />
            </tr>

            {/* Sub-column row */}
            <tr>
              {COLS.filter((c) => c.key !== 'approved').map((c, i) => {
                const Icon = c.icon;
                const active = colFilter === c.key;
                return (
                  <th key={c.key}
                    className={`border-b border-slate-200 p-0 ${i === 2 ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-200'}`}>
                    <button
                      onClick={() => handleColFilter(c.key as ColKey)}
                      className={`flex w-full items-center justify-center gap-1 px-2 py-1.5 transition-all hover:opacity-80 ${c.subBg} ${active ? 'ring-2 ring-inset ring-slate-500' : ''}`}
                      title={active ? `Clear ${c.label} filter` : `Filter by ${c.label}`}
                    >
                      <Icon className={`h-3 w-3 ${c.subText}`} />
                      <span className={`text-[10px] font-semibold ${c.subText}`}>{c.label}</span>
                      {active && <XCircle className={`h-3 w-3 ${c.subText}`} />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td colSpan={14} className="p-2">
                    <div className="h-8 animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-16 text-center">
                  <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-500">No submissions found</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {search || typeFilter ? 'Try adjusting the filters.' : 'No applications yet.'}
                  </p>
                </td>
              </tr>
            ) : (
              allSorted.map((app, i) => {
                const activeKey = getActiveCol(app.status);
                const doneBefore = DONE_BEFORE[activeKey];

                return (
                  <tr key={app.id}
                    onClick={() => onNavigate('app-detail', app.id)}
                    className={`cursor-pointer border-t border-slate-100 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-indigo-50/30`}>

                    {/* Row # */}
                    <td className="p-1.5 text-center align-middle w-8">
                      <span className="flex h-5 w-5 mx-auto items-center justify-center rounded bg-slate-700 text-[9px] font-bold text-white">
                        {i + 1}
                      </span>
                    </td>

                    {/* Serial No. */}
                    <td className="px-3 py-2.5 align-middle">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">{app.serialNumber || '—'}</span>
                    </td>

                    {/* Registration No. */}
                    <td className="px-3 py-2.5 align-middle">
                      <p className="font-mono text-xs font-semibold text-slate-700">{app.student?.registrationNumber || '—'}</p>
                      <p className="text-[10px] text-slate-400">{app.student?.fullName}</p>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-2.5 align-middle">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        app.type === 'MEDICAL' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {applicationTypeLabel(app)}
                      </span>
                    </td>

                    {/* Subjects count */}
                    <td className="px-3 py-2.5 text-center align-middle text-xs font-semibold text-slate-700">
                      {app.applicationSubjects?.length ?? 0}
                    </td>

                    {/* Submitted */}
                    <td className="border-r-2 border-r-slate-200 px-3 py-2.5 align-middle text-xs text-slate-500">
                      {fmtDateTime(app.submittedAt)}
                    </td>

                    {/* Stage cells */}
                    {COLS.map((col, ci) => {
                      const sep = ci === 2 || ci === 5 ? 'border-r-2 border-r-slate-300' : 'border-r border-slate-200';
                      const isActive = col.key === activeKey;
                      const isDone   = doneBefore.includes(col.key);

                      if (isActive) {
                        return (
                          <td key={col.key} className={`${col.cellBg} ${sep} px-1.5 py-2.5 align-middle last:border-0`}>
                            <div className={`mx-auto flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 shadow-sm ${col.cardBg} ${col.cardBorder}`}>
                              <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                              <span className={`text-[8px] font-bold ${col.cardText}`}>Current</span>
                            </div>
                          </td>
                        );
                      }

                      if (isDone) {
                        return (
                          <td key={col.key} className={`${col.cellBg} ${sep} px-1.5 py-2.5 align-middle last:border-0`}>
                            <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-emerald-100 bg-white px-2 py-0.5 shadow-sm">
                              <svg className="h-2.5 w-2.5 text-emerald-500 shrink-0" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="text-[8px] font-semibold text-emerald-600">Done</span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className={`${col.cellBg} ${sep} px-1.5 py-2.5 align-middle last:border-0`}>
                          <span className="mx-auto block h-0.5 w-3 rounded-full bg-slate-200" />
                        </td>
                      );
                    })}

                    {/* Arrow */}
                    <td className="p-1 align-middle w-6">
                      <ChevronRight className="mx-auto h-3.5 w-3.5 text-slate-300" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

    </div>
  );
}
