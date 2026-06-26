'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, FileText, Paperclip, ExternalLink, MessageSquare,
  CheckCircle2, XCircle, AlertCircle, Send, User, Loader2,
  ClipboardCheck, Image as ImageIcon, ChevronDown, BookOpen, Wallet,
} from 'lucide-react';
import { StaffShell } from '@/components/staff/StaffShell';
import { staffApi, StaffApplication } from '@/lib/staff-api';
import { useMyPermissions, can } from '@/lib/permissions';
import { STATUS_LABELS, STATUS_COLORS, formatFee, DOC_TYPE_LABELS } from '@/lib/applications-api';

const APPLICANT_FIELDS: { key: string; label: string }[] = [
  { key: 'fullName',           label: 'Full Name' },
  { key: 'nameWithInitials',   label: 'Name with Initials' },
  { key: 'registrationNumber', label: 'Registration No' },
  { key: 'nic',                label: 'NIC' },
  { key: 'batchNumber',        label: 'Batch' },
  { key: 'intake',             label: 'Intake' },
  { key: 'mobile',             label: 'Mobile' },
  { key: 'telephone',          label: 'Telephone' },
  { key: 'email',              label: 'Email' },
  { key: 'permanentAddress',   label: 'Permanent Address' },
  { key: 'postalAddress',      label: 'Postal Address' },
];

/* ── smooth height animation ── */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(open ? 'auto' : '0px');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      setH(`${el.scrollHeight}px`);
      const t = setTimeout(() => setH('auto'), 260);
      return () => clearTimeout(t);
    } else {
      setH(`${el.scrollHeight}px`);
      requestAnimationFrame(() => requestAnimationFrame(() => setH('0px')));
    }
  }, [open]);
  return (
    <div ref={ref} style={{ height: h, overflow: 'hidden', transition: 'height 240ms cubic-bezier(.4,0,.2,1)' }}>
      {children}
    </div>
  );
}

/* ── checkbox pill ── */
function Check({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
      on ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
    }`}>
      {on && (
        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/* ── accordion section ── */
function Section({
  step, icon, title, done, total, open, onToggle, children, extra, forceComplete, completeLabel,
}: {
  step: number; icon: React.ReactNode; title: string;
  done: number; total: number; open: boolean;
  onToggle: () => void; children: React.ReactNode; extra?: React.ReactNode;
  forceComplete?: boolean; completeLabel?: string;
}) {
  const complete = forceComplete || (total > 0 && done === total);
  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
      complete ? 'border-emerald-200' : 'border-slate-200'
    } bg-white shadow-sm`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-3 px-6 py-4 text-left transition-colors ${
          complete ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-slate-50/60'
        }`}
      >
        {/* Step number */}
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          complete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {complete ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : step}
        </span>

        <span className={`mr-1 ${complete ? 'text-emerald-600' : 'text-slate-400'}`}>{icon}</span>

        <span className={`flex-1 text-sm font-semibold ${complete ? 'text-emerald-800' : 'text-slate-800'}`}>
          {title}
        </span>

        {complete ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {completeLabel || 'Verified'}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
            {done}/{total}
          </span>
        )}

        <ChevronDown className={`ml-1 h-4 w-4 shrink-0 transition-transform duration-240 ${open ? 'rotate-180' : ''} ${
          complete ? 'text-emerald-400' : 'text-slate-400'
        }`} />
      </button>

      <Collapse open={open}>
        <div className={`border-t ${complete ? 'border-emerald-100' : 'border-slate-100'}`}>
          {children}
          {extra}
        </div>
      </Collapse>
    </div>
  );
}

/* ── field row: Label | Value | Checkbox ── */
function FieldRow({ label, value, on, onToggle, canVerify }: {
  label: string; value?: string; on: boolean; onToggle: () => void; canVerify: boolean;
}) {
  return (
    <div
      role={canVerify ? 'button' : undefined}
      tabIndex={canVerify ? 0 : undefined}
      onClick={canVerify ? onToggle : undefined}
      onKeyDown={canVerify ? (e) => e.key === 'Enter' && onToggle() : undefined}
      className={`flex items-center gap-4 border-b border-slate-50 px-6 py-3.5 last:border-0 transition-colors ${
        on ? 'bg-emerald-50/50' : canVerify ? 'cursor-pointer hover:bg-slate-50' : ''
      }`}
    >
      {/* Label — fixed width */}
      <span className="w-36 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {/* Value */}
      <span className={`flex-1 text-sm font-medium ${on ? 'text-emerald-900' : 'text-slate-800'}`}>
        {value || <span className="italic text-slate-300">—</span>}
      </span>
      {/* Checkbox */}
      {canVerify && <Check on={on} />}
    </div>
  );
}

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function StaffApplicationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, permissions } = useMyPermissions();
  const [app, setApp]       = useState<StaffApplication | null>(null);
  const [loading, setLoading]   = useState(true);
  const [remark, setRemark]     = useState('');
  const [acting, setActing]     = useState<'FORWARD' | 'REJECT' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [error, setError]       = useState('');
  const [busyDoc, setBusyDoc]   = useState<string | null>(null);
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [openSec, setOpenSec]   = useState(new Set(['ap', 'su', 'do']));

  useEffect(() => {
    staffApi.getApplication(id)
      .then(setApp).catch(() => setError('Not found')).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { setVerified(new Set()); }, [id]);

  const canReview = (isAdmin || can(permissions, 'applications', 'FULL')) && app?.status === 'SUBMITTED';
  const canFinance = (isAdmin || can(permissions, 'payments', 'FULL')) && app?.status === 'PAYMENT_PENDING';

  // Details were already verified by the Exam Division once the app moves past
  // SUBMITTED. In that case finance (and later viewers) see them as read-only,
  // already-verified, and collapsed — the focus is the payment.
  const examVerified =
    !!app && ['PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'UNDER_REVIEW', 'APPROVED'].includes(app.status);
  const detailsAlreadyVerified = examVerified && !canReview;

  // For finance (and later viewers), collapse the already-verified detail
  // sections once on load — keep only Attachments open so the payment slip is
  // immediately visible.
  const collapsedOnce = useRef(false);
  useEffect(() => {
    if (detailsAlreadyVerified && !collapsedOnce.current) {
      collapsedOnce.current = true;
      setOpenSec(new Set(canFinance ? ['do'] : []));
    }
  }, [detailsAlreadyVerified, canFinance]);

  const tick = (key: string) => {
    if (!canReview) return;
    setVerified((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleSec = (k: string) =>
    setOpenSec((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  /* derived */
  const subjKeys = (app?.applicationSubjects ?? []).map((s: any) => `s_${s.id}`);
  const docKeys  = (app?.documents ?? []).map((d) => `d_${d.id}`);
  const apDone   = APPLICANT_FIELDS.filter((f) => verified.has(f.key)).length;
  const suDone   = subjKeys.filter((k) => verified.has(k)).length;
  const doDone   = docKeys.filter((k) => verified.has(k)).length;
  const total    = APPLICANT_FIELDS.length + subjKeys.length + docKeys.length;
  const done     = apDone + suDone + doDone;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone  = canReview && done === total && total > 0;

  /* auto-collapse when section completes */
  const prev = useRef(new Set<string>());
  useEffect(() => {
    const apFull = APPLICANT_FIELDS.every((f) => verified.has(f.key));
    const suFull = subjKeys.length > 0 && subjKeys.every((k) => verified.has(k));
    const doFull = docKeys.length > 0 && docKeys.every((k) => verified.has(k));
    setOpenSec((s) => {
      const n = new Set(s);
      if (apFull && !APPLICANT_FIELDS.every((f) => prev.current.has(f.key))) n.delete('ap');
      if (suFull && !subjKeys.every((k) => prev.current.has(k))) n.delete('su');
      if (doFull && !docKeys.every((k) => prev.current.has(k))) n.delete('do');
      return n;
    });
    prev.current = new Set(verified);
  }, [verified]); // eslint-disable-line

  const doAction = async (action: 'FORWARD' | 'REJECT') => {
    setError('');
    if (action === 'REJECT' && !remark.trim()) { setError('A remark is required.'); return; }
    setActing(action);
    try {
      const u = await staffApi.examReview(id, action, remark.trim() || undefined);
      setApp(u); setShowReject(false); setRemark('');
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Action failed');
    } finally { setActing(null); }
  };

  const doFinance = async (action: 'APPROVE' | 'REJECT') => {
    setError('');
    if (action === 'REJECT' && !remark.trim()) { setError('A remark is required.'); return; }
    setActing(action === 'APPROVE' ? 'FORWARD' : 'REJECT');
    try {
      const u = await staffApi.financeReview(id, action, remark.trim() || undefined);
      setApp(u); setShowReject(false); setRemark('');
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Action failed');
    } finally { setActing(null); }
  };

  const viewDoc = async (docId: string) => {
    setBusyDoc(docId);
    try { window.open(await staffApi.documentUrl(docId), '_blank'); }
    catch { setError('Could not open document'); }
    finally { setBusyDoc(null); }
  };

  const ad = app?.applicantDetails as any;

  return (
    <StaffShell>
      <Link href="/dashboard/staff/applications"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to Applications
      </Link>

      {loading ? (
        <div className="space-y-4">
          {[112, 256, 200].map((h, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white" style={{ height: h }} />
          ))}
        </div>
      ) : !app ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <AlertCircle className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">{error || 'Application not found'}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">

          {/* ── Header card ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`h-1.5 ${app.type === 'MEDICAL' ? 'bg-rose-500' : 'bg-blue-600'}`} />
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  app.type === 'MEDICAL' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">
                    {app.student?.fullName || ad?.fullName || 'Applicant'}
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {app.type === 'MEDICAL' ? 'Medical' : 'Repeat'} · {app.student?.registrationNumber}
                    {app.submittedAt && ` · Submitted ${new Date(app.submittedAt).toLocaleDateString('en-LK', { dateStyle: 'medium' })}`}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[app.status] || 'bg-slate-100'}`}>
                {STATUS_LABELS[app.status] || app.status}
              </span>
            </div>
          </div>

          {/* ── Progress banner ── */}
          {canReview && (
            <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 px-6 py-4">
                <ClipboardCheck className="h-5 w-5 shrink-0 text-indigo-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Verification Progress</p>
                    <span className={`text-sm font-bold ${allDone ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {done}/{total} &nbsp;·&nbsp; {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Finance banner ── */}
          {canFinance && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
              <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Payment Verification</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Applicant details and subjects are already verified by the Exam Division. You only need to verify the payment below.
                </p>
              </div>
            </div>
          )}

          {/* ── 1. Applicant Details ── */}
          {ad && (
            <Section step={1} icon={<User className="h-4 w-4" />} title="Applicant Details"
              done={apDone} total={APPLICANT_FIELDS.length}
              forceComplete={detailsAlreadyVerified} completeLabel="Verified by Exam Division"
              open={openSec.has('ap')} onToggle={() => toggleSec('ap')}
              extra={canReview && apDone < APPLICANT_FIELDS.length ? (
                <div className="bg-slate-50 px-6 py-3">
                  <button
                    onClick={() => { const n = new Set(verified); APPLICANT_FIELDS.forEach((f) => n.add(f.key)); setVerified(n); }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    ✓ Mark all as verified
                  </button>
                </div>
              ) : undefined}
            >
              {APPLICANT_FIELDS.map((f) => (
                <FieldRow key={f.key} label={f.label} value={ad[f.key]}
                  on={verified.has(f.key)} onToggle={() => tick(f.key)} canVerify={canReview} />
              ))}
            </Section>
          )}

          {/* ── 2. Subjects ── */}
          <Section step={2} icon={<BookOpen className="h-4 w-4" />}
            title={`Subjects (${app.applicationSubjects.length})`}
            done={suDone} total={subjKeys.length}
            forceComplete={detailsAlreadyVerified} completeLabel="Verified by Exam Division"
            open={openSec.has('su')} onToggle={() => toggleSec('su')}
            extra={canReview && suDone < subjKeys.length ? (
              <div className="bg-slate-50 px-6 py-3">
                <button
                  onClick={() => { const n = new Set(verified); subjKeys.forEach((k) => n.add(k)); setVerified(n); }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  ✓ Mark all as verified
                </button>
              </div>
            ) : undefined}
          >
            {app.applicationSubjects.map((s: any) => {
              const key = `s_${s.id}`;
              const on  = verified.has(key);
              return (
                <div
                  key={s.id}
                  role={canReview ? 'button' : undefined}
                  tabIndex={canReview ? 0 : undefined}
                  onClick={canReview ? () => tick(key) : undefined}
                  onKeyDown={canReview ? (e) => e.key === 'Enter' && tick(key) : undefined}
                  className={`flex items-start gap-4 border-b border-slate-50 px-6 py-4 last:border-0 transition-colors ${
                    on ? 'bg-emerald-50/50' : canReview ? 'cursor-pointer hover:bg-slate-50' : ''
                  }`}
                >
                  {canReview && <span className="mt-0.5"><Check on={on} /></span>}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${on ? 'text-emerald-900' : 'text-slate-900'}`}>
                      <span className={on ? 'text-emerald-600' : 'text-blue-600'}>{s.subject.code}</span>
                      {' — '}{s.subject.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium ${on ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {s.category}
                      </span>
                      {s.caMarks != null && <span>CA Marks: <b>{s.caMarks}</b></span>}
                      {s.gradeEarned && <span>Grade: <b>{s.gradeEarned}</b></span>}
                      {s.previousExamDate && (
                        <span>
                          Prev Exam:{' '}
                          <b>{new Date(s.previousExamDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}</b>
                        </span>
                      )}
                      {s.previousExamIntake && (
                        <span>Prev Intake: <b>{s.previousExamIntake}</b></span>
                      )}
                      {s.upcomingExamIntake && (
                        <span>Upcoming Intake: <b>{s.upcomingExamIntake}</b></span>
                      )}
                    </div>
                  </div>
                  {on && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
                </div>
              );
            })}
          </Section>

          {/* ── 3. Attachments ── */}
          <Section step={3} icon={<Paperclip className="h-4 w-4" />} title="Attachments"
            done={doDone} total={docKeys.length}
            forceComplete={detailsAlreadyVerified} completeLabel="Verified by Exam Division"
            open={openSec.has('do')} onToggle={() => toggleSec('do')}
          >
            {!app.documents || app.documents.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No attachments.</p>
            ) : app.documents.map((doc) => {
              const key     = `d_${doc.id}`;
              const on      = verified.has(key);
              const isImage = doc.mimeType?.startsWith('image/');
              const Icon    = isImage ? ImageIcon : FileText;
              return (
                <div key={doc.id} className={`flex items-center gap-4 border-b border-slate-50 px-6 py-4 last:border-0 transition-colors ${on ? 'bg-emerald-50/50' : ''}`}>
                  {canReview && (
                    <button type="button" onClick={() => tick(key)} className="shrink-0">
                      <Check on={on} />
                    </button>
                  )}
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isImage ? 'bg-violet-50 text-violet-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${on ? 'text-emerald-900' : 'text-slate-900'}`}>
                      {doc.fileName}
                    </p>
                    <p className={`mt-0.5 text-xs ${on ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {DOC_TYPE_LABELS[doc.documentType]}{on ? ' · Verified' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => viewDoc(doc.id)}
                    disabled={busyDoc === doc.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50"
                  >
                    {busyDoc === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    View
                  </button>
                </div>
              );
            })}
          </Section>

          {/* ── Remarks ── */}
          {app.remarks && app.remarks.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-amber-100 px-6 py-4">
                <MessageSquare className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-800">Remarks</h3>
              </div>
              <div className="space-y-3 p-5">
                {app.remarks.map((r: any) => (
                  <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-slate-800">{r.content}</p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {r.user?.staffUser?.name || r.user?.email} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Summary ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-800">Application Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
              {[
                { label: 'Type',     value: app.type === 'MEDICAL' ? 'Medical' : 'Repeat' },
                { label: 'Subjects', value: String(app.applicationSubjects.length) },
                { label: 'Total Fee', value: formatFee(app.totalFee) },
                { label: 'Payment Ref', value: app.paymentReferenceId || '—' },
              ].map((item) => (
                <div key={item.label} className="bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Checklist ── */}
          {canReview && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-800">Verification Checklist</h3>
              </div>
              <div className="p-6">
                {[
                  { label: 'Applicant Details', done: apDone, total: APPLICANT_FIELDS.length, key: 'ap' },
                  { label: 'Subjects',          done: suDone, total: subjKeys.length,         key: 'su' },
                  { label: 'Attachments',       done: doDone, total: docKeys.length,          key: 'do' },
                ].map((s, i) => {
                  const complete = s.done === s.total && s.total > 0;
                  return (
                    <div key={s.key} className={`flex items-center gap-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        complete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {complete ? (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : i + 1}
                      </span>
                      <span className={`flex-1 text-sm font-medium ${complete ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {s.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${complete ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                            style={{ width: `${s.total > 0 ? Math.round((s.done / s.total) * 100) : 0}%` }}
                          />
                        </div>
                        <span className={`w-10 text-right text-xs font-semibold ${complete ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {s.done}/{s.total}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSec(s.key)}
                        className="text-xs text-indigo-500 hover:text-indigo-700"
                      >
                        {openSec.has(s.key) ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  );
                })}

                {/* Overall bar */}
                <div className={`mt-4 rounded-xl px-4 py-3 ${allDone ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={allDone ? 'text-emerald-700' : 'text-slate-600'}>
                      {allDone ? '✓ All items verified — ready to submit decision' : `${total - done} item${total - done !== 1 ? 's' : ''} remaining`}
                    </span>
                    <span className={allDone ? 'text-emerald-600' : 'text-slate-400'}>{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white shadow-inner">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Decision ── */}
          {canReview ? (
            <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm">
              <div className="border-b border-indigo-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-slate-800">Decision</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Complete the verification checklist above, then forward or reject this application.
                </p>
              </div>
              <div className="p-6">
                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                {!showReject ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => doAction('FORWARD')}
                      disabled={acting !== null || !allDone}
                      title={!allDone ? 'Complete all verification items first' : undefined}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {acting === 'FORWARD' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Forward to Finance
                    </button>
                    <button
                      onClick={() => { setShowReject(true); setError(''); }}
                      disabled={acting !== null}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Reject Application
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Reason for rejection <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        rows={3}
                        placeholder="Explain why this application is being rejected…"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => doAction('REJECT')}
                        disabled={acting !== null || !remark.trim()}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {acting === 'REJECT' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => { setShowReject(false); setError(''); setRemark(''); }}
                        disabled={acting !== null}
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : canFinance ? (
            <div className="rounded-2xl border border-amber-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-amber-100 px-6 py-4">
                <Wallet className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-800">Payment Verification</h3>
              </div>
              <div className="p-6">
                {/* Payment details */}
                <dl className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-100 bg-slate-100 sm:grid-cols-3">
                  {[
                    { label: 'Amount', value: formatFee(app.totalFee) },
                    { label: 'Reference', value: app.payment?.referenceNumber || app.paymentReferenceId || '—' },
                    { label: 'Slip Status', value: app.payment?.verificationStatus || 'PENDING' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{item.value}</p>
                    </div>
                  ))}
                </dl>

                <p className="mb-4 text-xs text-slate-500">
                  Confirm the payment slip against the reference and amount above, then approve or reject.
                </p>

                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                  </div>
                )}

                {!showReject ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => doFinance('APPROVE')}
                      disabled={acting !== null}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {acting === 'FORWARD' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve Payment
                    </button>
                    <button
                      onClick={() => { setShowReject(true); setError(''); }}
                      disabled={acting !== null}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Reject Payment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Reason for rejection <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        rows={3}
                        placeholder="Explain why this payment is being rejected…"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => doFinance('REJECT')}
                        disabled={acting !== null || !remark.trim()}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {acting === 'REJECT' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Confirm Rejection
                      </button>
                      <button
                        onClick={() => { setShowReject(false); setError(''); setRemark(''); }}
                        disabled={acting !== null}
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
              {['PAYMENT_VERIFIED', 'APPROVED'].includes(app.status)
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                : ['REJECTED', 'PAYMENT_REJECTED'].includes(app.status)
                  ? <XCircle className="h-5 w-5 text-red-500" />
                  : <AlertCircle className="h-5 w-5 text-slate-400" />}
              <p className="text-sm text-slate-600">
                {app.status === 'SUBMITTED'         ? 'Awaiting Exam Division verification.'
                : app.status === 'PAYMENT_PENDING'  ? 'Verified — awaiting Finance payment verification.'
                : app.status === 'PAYMENT_VERIFIED' ? 'Payment verified by Finance.'
                : app.status === 'PAYMENT_REJECTED' ? 'Payment was rejected by Finance.'
                : app.status === 'REJECTED'         ? 'This application was rejected.'
                : `Status: ${STATUS_LABELS[app.status] || app.status}`}
              </p>
            </div>
          )}

        </div>
      )}
    </StaffShell>
  );
}
