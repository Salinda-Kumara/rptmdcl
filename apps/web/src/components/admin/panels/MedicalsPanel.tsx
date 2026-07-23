'use client';

import React, { useEffect, useState } from 'react';
import {
  HeartPulse, ArrowLeft, Inbox, RefreshCw, Search, CheckCircle2, XCircle,
  Clock, ExternalLink, Loader2, FileText, BadgeCheck, AlertCircle, Download, Calendar,
} from 'lucide-react';
import { exportMedicalsExcel } from '@/lib/export-medicals';
import { medicalsApi, MedicalSubmission, MEDICAL_STATUS_LABELS, MEDICAL_STATUS_COLORS } from '@/lib/medicals-api';
import apiClient from '@/lib/api-client';
import { useMyPermissions, can } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/applications-api';

const fmtDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const escapeHtml = (str?: string | null) =>
  str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';

type Tab = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; tint: string }[] = [
  { key: 'SUBMITTED', label: 'To Review', icon: Clock,        tint: 'text-amber-700' },
  { key: 'APPROVED',  label: 'Approved',  icon: CheckCircle2, tint: 'text-emerald-700' },
  { key: 'REJECTED',  label: 'Rejected',  icon: XCircle,      tint: 'text-red-700' },
];

/* ── Detail view ── */
function MedicalDetail({ id, onBack, backLabel, onChanged }: { id: string; onBack: () => void; backLabel?: string; onChanged: () => void }) {
  const { isAdmin, permissions } = useMyPermissions();
  const canReview = isAdmin || can(permissions, 'medicals', 'FULL');
  const [sub, setSub] = useState<MedicalSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [acting, setActing] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    medicalsApi.getStaff(id).then(setSub).catch(() => setError('Not found')).finally(() => setLoading(false));
  }, [id]);

  const doReview = async (action: 'APPROVE' | 'REJECT') => {
    setError('');
    if (action === 'REJECT' && !remark.trim()) { setError('A remark is required when rejecting.'); return; }
    setActing(action);
    try {
      const u = await medicalsApi.review(id, action, remark.trim() || undefined);
      setSub(u); setShowReject(false); setRemark('');
      onChanged();
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Action failed');
    } finally { setActing(null); }
  };

  const viewDoc = async (docId: string, fileName: string) => {
    setBusyDoc(docId);
    try {
      const res = await apiClient.get(`/documents/${docId}/download`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const mime = (res.data as Blob).type || '';

      if (sub?.status !== 'APPROVED') {
        window.open(blobUrl, '_blank');
        return;
      }

      // Build a viewer page with an "APPROVED" stamp overlay (visible on print too)
      const isImage = mime.startsWith('image/');
      const serial = sub.serialNumber || '';
      const approvedBy = sub.reviewedBy || '';
      const approvedDate = sub.reviewedAt
        ? new Date(sub.reviewedAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(fileName)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;background:#f1f5f9;font-family:system-ui,sans-serif}
  .wrap{position:relative;width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center}
  img.doc{max-width:100%;max-height:100vh;display:block}
  iframe.doc{width:100%;height:100vh;border:none}
  .stamp{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);
    pointer-events:none;z-index:999;
    border:6px solid rgba(22,163,74,.45);border-radius:16px;padding:18px 48px;
    color:rgba(22,163,74,.45);font-size:64px;font-weight:900;letter-spacing:6px;
    text-transform:uppercase;text-align:center;line-height:1.3;
    font-family:system-ui,sans-serif;white-space:nowrap}
  .stamp .detail{font-size:16px;letter-spacing:1px;display:block;margin-top:6px;text-transform:none;font-weight:700}
  .stamp .serial{font-size:20px;letter-spacing:2px;display:block;margin-top:4px}
  @media print{
    body{background:#fff}
    .stamp{position:fixed;-webkit-print-color-adjust:exact;print-color-adjust:exact;
      color:rgba(22,163,74,.35)!important;border-color:rgba(22,163,74,.35)!important}
    img.doc{max-height:none;width:100%}
    iframe.doc{height:100vh}
  }
</style></head><body>
<div class="wrap">
  ${isImage
    ? `<img class="doc" src="${blobUrl}" alt="${escapeHtml(fileName)}">`
    : `<iframe class="doc" src="${blobUrl}"></iframe>`}
  <div class="stamp">Approved${serial ? `<span class="serial">${escapeHtml(serial)}</span>` : ''}${approvedBy ? `<span class="detail">By: ${escapeHtml(approvedBy)}</span>` : ''}${approvedDate ? `<span class="detail">${escapeHtml(approvedDate)}</span>` : ''}</div>
</div></body></html>`;

      const viewerBlob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(viewerBlob), '_blank');
    } catch {
      setError('Could not open document');
    } finally {
      setBusyDoc(null);
    }
  };

  const ad: any = sub?.applicantDetails ?? {};

  return (
    <div>
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> {backLabel || 'Back to Medical Submissions'}
      </button>

      {loading ? (
        <div className="space-y-4">{[100, 220].map((h, i) => <div key={i} className="animate-pulse rounded-2xl bg-white" style={{ height: h }} />)}</div>
      ) : !sub ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <AlertCircle className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">{error || 'Not found'}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Header */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 bg-rose-500" />
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-900">{sub.student?.fullName || ad.fullName}</h1>
                    {sub.serialNumber && (
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700">
                        {sub.serialNumber}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {sub.student?.registrationNumber || ad.registrationNumber} · Submitted {fmtDateTime(sub.submittedAt)}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${MEDICAL_STATUS_COLORS[sub.status] || 'bg-slate-100'}`}>
                {MEDICAL_STATUS_LABELS[sub.status] || sub.status}
              </span>
            </div>
          </div>

          {/* Applicant details (form snapshot) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4"><h3 className="text-sm font-semibold text-slate-800">Applicant Details</h3></div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 p-6 sm:grid-cols-2">
              {[
                ['Full Name', ad.fullName], ['Name with Initials', ad.nameWithInitials],
                ['SAB Registration No', ad.registrationNumber], ['NIC / Passport No', ad.nic],
                ['Intake', ad.intake], ['Contact Numbers', ad.contactNumbers],
                ['Permanent Address', ad.permanentAddress],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{(value as string) || '—'}</p>
                </div>
              ))}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total No. of Days</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{sub.totalDays ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Absent exams */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-800">Absent Exams ({sub.items.length})</h3>
            </div>
            <ul className="divide-y divide-slate-50">
              {sub.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                  <p className="text-sm font-medium text-slate-800">
                    <span className="font-mono text-xs text-rose-600">{i.subject.code}</span> — {i.subject.name}
                  </p>
                  <span className="text-xs text-slate-500">Exam date: <b>{fmtDay(i.examDate)}</b></span>
                </li>
              ))}
            </ul>
          </div>

          {/* Certificates */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4"><h3 className="text-sm font-semibold text-slate-800">Medical Certificate</h3></div>
            {(sub.documents?.length ?? 0) === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No files attached.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {sub.documents!.map((d) => (
                  <li key={d.id} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><FileText className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{d.fileName}</span>
                    {sub.status === 'APPROVED' && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        <BadgeCheck className="h-3 w-3" /> Approved
                      </span>
                    )}
                    <button onClick={() => viewDoc(d.id, d.fileName)} disabled={busyDoc === d.id}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm disabled:opacity-50 ${
                        sub.status === 'APPROVED'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-600'
                      }`}>
                      {busyDoc === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />} View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Decision */}
          {sub.status === 'SUBMITTED' && canReview ? (
            <div className="rounded-2xl border border-rose-200 bg-white shadow-sm">
              <div className="border-b border-rose-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-800">Decision</h3>
                <p className="mt-0.5 text-xs text-slate-500">Approving assigns the next Medical Verification Serial automatically.</p>
              </div>
              <div className="p-6">
                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                  </div>
                )}
                {!showReject ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button onClick={() => doReview('APPROVE')} disabled={acting !== null}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                      {acting === 'APPROVE' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                      Approve & Assign Serial
                    </button>
                    <button onClick={() => { setShowReject(true); setError(''); }} disabled={acting !== null}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                      <XCircle className="h-4 w-4" /> Not Approved
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason <span className="text-red-500">*</span></label>
                      <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3}
                        placeholder="Explain why this medical application is not approved…"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => doReview('REJECT')} disabled={acting !== null || !remark.trim()}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                        {acting === 'REJECT' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Confirm
                      </button>
                      <button onClick={() => { setShowReject(false); setError(''); setRemark(''); }} disabled={acting !== null}
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : sub.status !== 'SUBMITTED' ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              {sub.status === 'APPROVED' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              <p className="text-sm text-slate-600">
                {sub.status === 'APPROVED'
                  ? <>Approved by <b>{sub.reviewedBy}</b> · {fmtDateTime(sub.reviewedAt)} — Serial <b className="font-mono">{sub.serialNumber}</b></>
                  : <>Not approved by <b>{sub.reviewedBy}</b> · {fmtDateTime(sub.reviewedAt)}{sub.reviewRemarks ? <> — {sub.reviewRemarks}</> : null}</>}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ── Panel (queue) ── */
export function MedicalsPanel({ initialId, onBack, backLabel }: { initialId?: string; onBack?: () => void; backLabel?: string } = {}) {
  const [tab, setTab] = useState<Tab>('SUBMITTED');
  const [all, setAll] = useState<MedicalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);

  const load = () => {
    setLoading(true);
    medicalsApi.listStaff().then(setAll).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setSelectedId(null);
    }
  };

  if (selectedId) {
    return <MedicalDetail id={selectedId} onBack={handleBack} backLabel={backLabel} onChanged={load} />;
  }

  const q = search.trim().toLowerCase();
  const rows = all
    .filter((m) => m.status === tab)
    .filter((m) => {
      const dt = m.submittedAt ? new Date(m.submittedAt) : new Date(m.createdAt);
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (dt < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59.999`);
        if (dt > to) return false;
      }
      if (!q) return true;
      return (
        (m.student?.fullName ?? '').toLowerCase().includes(q) ||
        (m.student?.registrationNumber ?? '').toLowerCase().includes(q) ||
        (m.serialNumber ?? '').toLowerCase().includes(q) ||
        m.items.some((i) => i.subject.code.toLowerCase().includes(q) || i.subject.name.toLowerCase().includes(q))
      );
    });

  const handleExport = async () => {
    setExporting(true);
    try {
      const filterNotes: string[] = [`Status: ${MEDICAL_STATUS_LABELS[tab] || tab}`];
      if (dateFrom) filterNotes.push(`From: ${dateFrom}`);
      if (dateTo) filterNotes.push(`To: ${dateTo}`);
      if (search.trim()) filterNotes.push(`Search: "${search.trim()}"`);
      await exportMedicalsExcel(rows, { filterNote: filterNotes.join(' | ') });
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-gray-100">
            <HeartPulse className="h-5 w-5 text-rose-500" /> Medical Submissions
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
            Medical certificates for missed exams — approving assigns the Medical Verification Serial.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">From:</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-gray-200 focus:outline-none" />
            <span className="text-slate-400 font-medium">To:</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-gray-200 focus:outline-none" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="ml-1 text-[11px] font-bold text-rose-500 hover:text-rose-700">Clear</button>
            )}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, reg no, serial…"
              className="w-44 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs shadow-sm focus:border-rose-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
          </div>
          <button onClick={load} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-rose-500' : ''}`} /> Refresh
          </button>
          <button onClick={handleExport} disabled={exporting || rows.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export Excel ({rows.length})
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex w-fit gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-gray-700 dark:bg-gray-800">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = all.filter((m) => m.status === t.key).length;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                active ? `bg-white dark:bg-gray-700 ${t.tint} shadow-sm` : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'
              }`}>
              <Icon className="h-4 w-4" /> {t.label}
              {!loading && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-slate-100 dark:bg-gray-600' : 'bg-slate-200 text-slate-500 dark:bg-gray-700 dark:text-gray-400'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />)}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-900">
          <Inbox className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            {tab === 'SUBMITTED' ? 'No medical submissions awaiting review' : tab === 'APPROVED' ? 'No approved submissions yet' : 'No rejected submissions'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left dark:border-gray-800 dark:bg-gray-800/60">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">#</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Serial</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Student</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Subjects</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Days</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={m.id} onClick={() => setSelectedId(m.id)}
                  className={`cursor-pointer border-t border-slate-100 transition-colors dark:border-gray-800 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/50 dark:bg-gray-900/60'} hover:bg-rose-50/50 dark:hover:bg-rose-900/10`}>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    {m.serialNumber
                      ? <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{m.serialNumber}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">{m.student?.fullName || '—'}</p>
                    <p className="font-mono text-[10px] text-slate-400">{m.student?.registrationNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-gray-300">
                    {m.items.map((it) => `${it.subject.code} — ${it.subject.name}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-gray-300">{m.totalDays ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDateTime(m.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
