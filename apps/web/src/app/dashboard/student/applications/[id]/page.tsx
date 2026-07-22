'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Wallet,
  MessageSquare,
  CheckCircle2,
  CreditCard,
  Trash2,
  Send,
  AlertCircle,
  Printer,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { DocumentsCard } from '@/components/student/DocumentsCard';
import apiClient from '@/lib/api-client';
import { printApplicationPacket, openBlankTab } from '@/lib/application-form-pdf';
import {
  applicationsApi,
  Application,
  ApplicationDocument,
  DocumentType,
  STATUS_LABELS,
  STATUS_COLORS,
  formatFee,
  applicationTypeLabel,
} from '@/lib/applications-api';

const WORKFLOW = ['DRAFT', 'SUBMITTED', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'APPROVED'];

// Grade earned on a previous attempt — a repeat is only possible below a pass,
// so the options are capped to the fail-range grades.
const GRADE_OPTIONS = ['C-', 'D+', 'D', 'E'];

// Mandatory attachments per application type (mirrors the API rule). Medical
// certificates are optional, so only the payment slip is required for either type.
const REQUIRED_DOCS: Record<'MEDICAL' | 'REPEAT', DocumentType[]> = {
  REPEAT: ['PAYMENT_SLIP'],
  MEDICAL: ['PAYMENT_SLIP'],
};

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<ApplicationDocument[]>([]);
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  // Editable copies used only while a RETURNED application is being corrected.
  const [editContact, setEditContact] = useState<{ permanentAddress: string; postalAddress: string; telephone: string; mobile: string; email: string }>({ permanentAddress: '', postalAddress: '', telephone: '', mobile: '', email: '' });
  const [editSubjects, setEditSubjects] = useState<Record<string, { caMarks: string; upcomingExamIntake: string; upcomingExamDate: string; previousExamIntake: string; gradeEarned: string; secondAttemptIntake: string; secondAttemptGrade: string; medicalApprovalSerial: string }>>({});
  // Intake suggestions for the "Intake Details" fields (same source as the new-application form).
  const [batchList, setBatchList] = useState<string[]>([]);

  const isReturned = app?.status === 'RETURNED';

  const missingDocs: DocumentType[] = app
    ? (REQUIRED_DOCS[app.type] || []).filter((t) => !docs.some((d) => d.documentType === t))
    : [];

  // Seed the editable copies from an application (used when it is RETURNED).
  const seedEdits = (a: Application) => {
    const d = (a.applicantDetails ?? {}) as any;
    setEditContact({
      permanentAddress: d.permanentAddress ?? '', postalAddress: d.postalAddress ?? '',
      telephone: d.telephone ?? '', mobile: d.mobile ?? '', email: d.email ?? '',
    });
    const iso = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : '');
    setEditSubjects(Object.fromEntries((a.applicationSubjects ?? []).map((s) => [s.id, {
      caMarks: s.caMarks != null ? String(s.caMarks) : '',
      upcomingExamIntake: s.upcomingExamIntake ?? '',
      upcomingExamDate: iso(s.upcomingExamDate),
      previousExamIntake: s.previousExamIntake ?? '',
      gradeEarned: s.gradeEarned ?? '',
      secondAttemptIntake: s.secondAttemptIntake ?? '',
      secondAttemptGrade: s.secondAttemptGrade ?? '',
      medicalApprovalSerial: s.medicalApprovalSerial ?? '',
    }])));
  };

  useEffect(() => {
    applicationsApi.getMyApplication(id)
      .then((a) => { setApp(a); seedEdits(a); })
      .catch(() => setError('Application not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    apiClient.get<string[]>('/auth/batches').then((r) => setBatchList(r.data)).catch(() => {});
  }, []);

  const setSub = (sid: string, field: string, value: string) =>
    setEditSubjects((prev) => ({ ...prev, [sid]: { ...prev[sid], [field]: value } }));

  const handleResubmit = async () => {
    setResubmitting(true); setError(''); setSuccess('');
    try {
      const updated = await applicationsApi.resubmit(id, {
        applicant: editContact,
        subjects: Object.entries(editSubjects).map(([sid, v]) => ({
          id: sid,
          caMarks: v.caMarks === '' ? undefined : Number(v.caMarks),
          upcomingExamIntake: v.upcomingExamIntake || undefined,
          upcomingExamDate: v.upcomingExamDate || undefined,
          previousExamIntake: v.previousExamIntake || undefined,
          gradeEarned: v.gradeEarned || undefined,
          secondAttemptIntake: v.secondAttemptIntake || undefined,
          secondAttemptGrade: v.secondAttemptGrade || undefined,
          medicalApprovalSerial: v.medicalApprovalSerial || undefined,
        })),
      });
      setApp(updated); seedEdits(updated);
      setSuccess('Application corrected and resubmitted.');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Resubmission failed');
    } finally {
      setResubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (missingDocs.length > 0) {
      setError('Please attach the required documents before submitting.');
      return;
    }
    if (!paymentRef.trim()) { setError('Enter a payment reference number'); return; }
    setSubmitting(true); setError('');
    try {
      await applicationsApi.submit(id, paymentRef.trim());
      router.push('/dashboard/student/applications');
      return;
    } catch (e: any) {
      setError(e.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this application? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await applicationsApi.cancel(id);
      router.push('/dashboard/student/applications');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Cancel failed');
      setCancelling(false);
    }
  };

  const activeStep = app ? Math.max(0, WORKFLOW.indexOf(app.status)) : 0;
  const isTerminal = app && ['REJECTED', 'CANCELLED'].includes(app.status);

  return (
    <StudentShell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/dashboard/student/applications"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Applications
        </Link>
        {app && app.status !== 'DRAFT' && (
          <button
            onClick={async () => {
              if (printing) return;
              const win = openBlankTab(); // open synchronously to keep the user gesture
              setPrinting(true);
              setPrintProgress('Starting…');
              const nic = (app.applicantDetails as any)?.nic || (app as any).student?.nic || '';
              try {
                await printApplicationPacket(app, win, nic ? `NIC ${nic}` : undefined, (p) =>
                  setPrintProgress(`${p.label} (${p.current}/${p.total})`));
              } catch (e) { console.error(e); }
              finally { setPrinting(false); setPrintProgress(''); }
            }}
            disabled={printing}
            title={printing ? printProgress : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {printing ? printProgress || 'Generating…' : 'Print Application'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-white" />
          <div className="h-48 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : error && !app ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <AlertCircle className="h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-600">{error}</p>
        </div>
      ) : app ? (
        <>
          {/* Header */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`h-1.5 ${app.type === 'MEDICAL' ? 'bg-rose-500' : 'bg-blue-600'}`} />
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    app.type === 'MEDICAL' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold text-slate-900">
                      {applicationTypeLabel(app)} Application
                    </h1>
                    {app.serialNumber && (
                      <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 font-mono text-sm font-bold text-indigo-700">
                        #{app.serialNumber}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {app.serialNumber
                      ? `Submitted on ${new Date(app.submittedAt ?? app.createdAt).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}`
                      : `Created ${new Date(app.createdAt).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[app.status] || 'bg-slate-100'}`}>
                {STATUS_LABELS[app.status] || app.status}
              </span>
            </div>

            {/* Progress timeline */}
            {!isTerminal && !isReturned && (
              <div className="border-t border-slate-100 px-6 py-5">
                <div className="flex items-center">
                  {WORKFLOW.map((step, i) => {
                    const done = i <= activeStep;
                    const current = i === activeStep;
                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                              done ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                            } ${current ? 'ring-4 ring-blue-100' : ''}`}
                          >
                            {done && i < activeStep ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                          </div>
                          <span className={`mt-2 hidden text-center text-[11px] font-medium sm:block ${done ? 'text-slate-700' : 'text-slate-400'}`}>
                            {STATUS_LABELS[step]}
                          </span>
                        </div>
                        {i < WORKFLOW.length - 1 && (
                          <div className={`mx-1 h-0.5 flex-1 rounded ${i < activeStep ? 'bg-blue-600' : 'bg-slate-100'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Approved — collection notice */}
          {app.status === 'APPROVED' && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Application Approved</p>
                <p className="mt-0.5 text-sm text-emerald-700">You can collect your admission from the Examination Division.</p>
              </div>
            </div>
          )}

          {/* Returned for correction */}
          {isReturned && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-6 py-4">
              <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Returned for Correction</p>
                <p className="mt-0.5 text-sm text-orange-700">
                  The Examination Division asked you to correct some details (see Remarks below). Fix them in the
                  form below, re-upload any documents if needed, then resubmit.
                </p>
              </div>
            </div>
          )}

          {/* Two-column body */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Correction form — RETURNED only */}
              {isReturned && (
                <div className="rounded-2xl border border-orange-200 bg-white shadow-sm">
                  <datalist id="intake-list">
                    {batchList.map((b) => <option key={b} value={b} />)}
                  </datalist>
                  <div className="border-b border-orange-100 px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900">Correct &amp; Resubmit</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Your name, registration number and NIC are fixed. You can correct contact details and each subject&apos;s data.
                    </p>
                  </div>
                  <div className="space-y-5 p-6">
                    {/* Contact fields */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {([
                        ['permanentAddress', 'Permanent Address', 'sm:col-span-2'],
                        ['postalAddress', 'Postal Address', 'sm:col-span-2'],
                        ['mobile', 'Mobile', ''],
                        ['telephone', 'Telephone', ''],
                        ['email', 'Email', 'sm:col-span-2'],
                      ] as const).map(([k, label, span]) => (
                        <div key={k} className={span}>
                          <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                          <input
                            type="text"
                            value={(editContact as any)[k]}
                            onChange={(e) => setEditContact((prev) => ({ ...prev, [k]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Per-subject fields */}
                    <div className="space-y-3">
                      {app.applicationSubjects.map((s) => {
                        const v = editSubjects[s.id] ?? { caMarks: '', upcomingExamIntake: '', upcomingExamDate: '', previousExamIntake: '', gradeEarned: '', secondAttemptIntake: '', secondAttemptGrade: '', medicalApprovalSerial: '' };
                        return (
                          <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                            <p className="mb-3 text-sm font-semibold text-slate-800">
                              <span className="text-blue-600">{s.subject.code}</span> — {s.subject.name}
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{s.category}</span>
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">CA Marks</label>
                                <input type="number" min={1} max={100} step={1} value={v.caMarks}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '') { setSub(s.id, 'caMarks', ''); return; }
                                    const n = Number(raw);
                                    if (!Number.isFinite(n)) return;
                                    setSub(s.id, 'caMarks', String(Math.min(100, Math.max(0, n))));
                                  }}
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Upcoming Exam Intake</label>
                                <input type="text" value={v.upcomingExamIntake}
                                  onChange={(e) => setSub(s.id, 'upcomingExamIntake', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Upcoming Exam Date</label>
                                <input type="date" value={v.upcomingExamDate}
                                  onChange={(e) => setSub(s.id, 'upcomingExamDate', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                              </div>
                            </div>

                            {/* Previous Examination Details — 1st / 2nd attempt */}
                            <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">1st Attempt</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Intake Details</label>
                                <input type="text" value={v.previousExamIntake}
                                  list="intake-list"
                                  onChange={(e) => setSub(s.id, 'previousExamIntake', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                              </div>
                              {s.category === 'REPEAT' && (
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">Grade Earned</label>
                                  <select value={v.gradeEarned}
                                    onChange={(e) => setSub(s.id, 'gradeEarned', e.target.value)}
                                    className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100">
                                    <option value="" disabled>—</option>
                                    {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>

                            <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              2nd Attempt <span className="font-medium normal-case text-slate-400">(if applicable)</span>
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Intake Details</label>
                                <input type="text" value={v.secondAttemptIntake}
                                  list="intake-list"
                                  onChange={(e) => setSub(s.id, 'secondAttemptIntake', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                              </div>
                              {s.category === 'REPEAT' && (
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">Grade Earned</label>
                                  <select value={v.secondAttemptGrade}
                                    onChange={(e) => setSub(s.id, 'secondAttemptGrade', e.target.value)}
                                    className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100">
                                    <option value="">—</option>
                                    {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>

                            {s.category === 'MEDICAL' && (
                              <div className="mt-3 border-t border-slate-100 pt-3">
                                <label className="mb-1 block text-xs font-medium text-slate-600">Medical Approval Serial Number</label>
                                <input type="text" placeholder="e.g 123" value={v.medicalApprovalSerial}
                                  onChange={(e) => setSub(s.id, 'medicalApprovalSerial', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                                <p className="mt-1 text-[11px] text-slate-400">
                                  Check Approve list on SAB LMS:{' '}
                                  <a
                                    href="https://sablms.casrilanka.com/course/index.php?categoryid=1075"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-blue-600 underline hover:text-blue-700"
                                  >
                                    sablms.casrilanka.com
                                  </a>
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {success && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> {success}
                      </div>
                    )}
                    {error && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4" /> {error}
                      </div>
                    )}

                    <button
                      onClick={handleResubmit}
                      disabled={resubmitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50"
                    >
                      {resubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {resubmitting ? 'Resubmitting…' : 'Correct & Resubmit'}
                    </button>
                  </div>
                </div>
              )}

              {/* Applicant details */}
              {app.applicantDetails && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-900">Applicant Details</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 p-6 sm:grid-cols-2">
                    {[
                      { label: 'Full Name', value: app.applicantDetails.fullName },
                      { label: 'Name with Initials', value: app.applicantDetails.nameWithInitials },
                      { label: 'Registration No', value: app.applicantDetails.registrationNumber },
                      { label: 'NIC', value: app.applicantDetails.nic },
                      { label: 'Mobile', value: app.applicantDetails.mobile },
                      { label: 'Email', value: app.applicantDetails.email },
                      { label: 'Permanent Address', value: app.applicantDetails.permanentAddress, full: true },
                      { label: 'Postal Address', value: app.applicantDetails.postalAddress, full: true },
                    ].map((f) => (
                      <div key={f.label} className={f.full ? 'sm:col-span-2' : ''}>
                        <p className="text-[11px] font-medium text-slate-400">{f.label}</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{f.value || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Subjects <span className="text-slate-400">({app.applicationSubjects.length})</span>
                  </h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  {app.applicationSubjects.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-4 px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          <span className="text-blue-600">{s.subject.code}</span> — {s.subject.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {s.caMarks != null ? `CA Marks: ${s.caMarks}` : 'CA Marks: —'}
                        </p>
                      </div>
                      <span className="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {s.category}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Attachments */}
              <DocumentsCard
                applicationId={app.id}
                appType={app.type}
                editable={['DRAFT', 'RETURNED'].includes(app.status)}
                onDocsChange={setDocs}
                requiredMissing={['DRAFT', 'RETURNED'].includes(app.status) ? missingDocs : []}
              />

              {/* Remarks */}
              {app.remarks && app.remarks.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">Remarks</h3>
                  </div>
                  <div className="space-y-3 p-6">
                    {app.remarks.map((r) => (
                      <div key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm text-slate-800">{r.content}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {r.user?.staffUser?.name || r.user?.email} · {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar column */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">Summary</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Type</dt>
                    <dd className="font-medium text-slate-900">{applicationTypeLabel(app)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Subjects</dt>
                    <dd className="font-medium text-slate-900">{app.applicationSubjects.length}</dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <dt className="text-slate-500">Total Fee</dt>
                    <dd className="text-base font-bold text-blue-600">{formatFee(app.totalFee)}</dd>
                  </div>
                  {app.paymentReferenceId && (
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500">Payment Ref</dt>
                      <dd className="truncate font-mono text-xs font-semibold text-slate-700">{app.paymentReferenceId}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Payment */}
              {app.payment && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">Payment</h3>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500">Amount</dt>
                      <dd className="font-semibold text-slate-900">{formatFee(app.payment.amount)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500">Status</dt>
                      <dd>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            app.payment.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : app.payment.verificationStatus === 'REJECTED'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {app.payment.verificationStatus}
                        </span>
                      </dd>
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                      <dt className="mb-0.5 text-slate-500">Reference</dt>
                      <dd className="truncate font-mono text-sm text-slate-700">{app.payment.referenceNumber}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Submit action (DRAFT only) */}
              {app.status === 'DRAFT' && (
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Submit Application</h3>
                  </div>
                  <p className="mb-4 text-sm text-slate-600">
                    Pay <span className="font-semibold text-blue-700">{formatFee(app.totalFee)}</span> to Sampath Bank,
                    Borella (Acc <span className="font-mono">000460002370</span>), then enter your payment reference.
                  </p>

                  {/* Required documents checklist */}
                  <div className="mb-4 space-y-1.5 rounded-lg border border-slate-200 bg-white/70 p-3">
                    <p className="mb-1 text-xs font-semibold text-slate-500">Required attachments</p>
                    {REQUIRED_DOCS[app.type].map((t) => {
                      const has = docs.some((d) => d.documentType === t);
                      return (
                        <div key={t} className="flex items-center gap-2 text-sm">
                          {has ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                          )}
                          <span className={has ? 'text-slate-700' : 'text-slate-500'}>
                            {t === 'PAYMENT_SLIP' ? 'Payment slip' : 'Medical certificate'}
                          </span>
                          <span className={`ml-auto text-xs font-medium ${has ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {has ? 'Attached' : 'Missing'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {success && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> {success}
                    </div>
                  )}
                  {error && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Payment reference"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || missingDocs.length > 0}
                    title={missingDocs.length > 0 ? 'Attach the required documents first' : undefined}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? 'Submitting…' : 'Submit Application'}
                  </button>

                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {cancelling ? 'Cancelling…' : 'Cancel application'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </StudentShell>
  );
}
