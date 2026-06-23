'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Paperclip,
  Download,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  User,
  Loader2,
} from 'lucide-react';
import { StaffShell } from '@/components/staff/StaffShell';
import { staffApi, StaffApplication, rolesOf } from '@/lib/staff-api';
import { STATUS_LABELS, STATUS_COLORS, formatFee, DOC_TYPE_LABELS } from '@/lib/applications-api';

const EXAM_DIVISION_ROLES = ['VERIFICATION_OFFICER', 'EXAM_MANAGER', 'SUPER_ADMIN'];

export default function StaffApplicationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<StaffApplication | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState('');
  const [acting, setActing] = useState<'FORWARD' | 'REJECT' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState('');
  const [busyDoc, setBusyDoc] = useState<string | null>(null);

  const load = () => {
    staffApi.getApplication(id).then(setApp).catch(() => setError('Application not found')).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    staffApi.getProfile().then((u) => setRoles(rolesOf(u))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isExamDivision = roles.some((r) => EXAM_DIVISION_ROLES.includes(r));
  const canReview = isExamDivision && app?.status === 'SUBMITTED';

  const doAction = async (action: 'FORWARD' | 'REJECT') => {
    setError('');
    if (action === 'REJECT' && !remark.trim()) {
      setError('A remark is required to reject this application.');
      return;
    }
    setActing(action);
    try {
      const updated = await staffApi.examReview(id, action, remark.trim() || undefined);
      setApp(updated);
      setShowReject(false);
      setRemark('');
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const openDoc = async (docId: string) => {
    setBusyDoc(docId);
    try {
      const url = await staffApi.documentUrl(docId);
      window.open(url, '_blank');
    } catch {
      setError('Could not open document');
    } finally {
      setBusyDoc(null);
    }
  };

  const ad = app?.applicantDetails as any;

  return (
    <StaffShell>
      <Link href="/dashboard/staff/applications" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to Applications
      </Link>

      {loading ? (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
        </div>
      ) : !app ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <AlertCircle className="h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-600">{error || 'Application not found'}</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`h-1.5 ${app.type === 'MEDICAL' ? 'bg-rose-500' : 'bg-blue-600'}`} />
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${app.type === 'MEDICAL' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{app.student?.fullName || ad?.fullName || 'Applicant'}</h1>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {app.type === 'MEDICAL' ? 'Medical' : 'Repeat'} · {app.student?.registrationNumber} ·{' '}
                    {app.submittedAt ? `Submitted ${new Date(app.submittedAt).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}` : 'Not submitted'}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLORS[app.status] || 'bg-slate-100'}`}>
                {STATUS_LABELS[app.status] || app.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Applicant details */}
              {ad && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                    <User className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">Applicant Details</h3>
                    <span className="ml-auto text-[11px] text-slate-400">as filled on this application</span>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 p-6 sm:grid-cols-2">
                    {[
                      ['Full Name', ad.fullName],
                      ['Name with Initials', ad.nameWithInitials],
                      ['Registration No', ad.registrationNumber],
                      ['NIC', ad.nic],
                      ['Batch', ad.batchNumber],
                      ['Intake', ad.intake],
                      ['Mobile', ad.mobile],
                      ['Telephone', ad.telephone],
                      ['Email', ad.email],
                      ['Permanent Address', ad.permanentAddress, true],
                      ['Postal Address', ad.postalAddress, true],
                    ].map(([label, value, full]) => (
                      <div key={label as string} className={full ? 'sm:col-span-2' : ''}>
                        <p className="text-[11px] font-medium text-slate-400">{label as string}</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{(value as string) || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Subjects <span className="text-slate-400">({app.applicationSubjects.length})</span></h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="px-6 py-2 font-medium">Subject</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 font-medium">CA Marks</th>
                        <th className="px-3 py-2 font-medium">Prev. Exam</th>
                        <th className="px-6 py-2 font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {app.applicationSubjects.map((s: any) => (
                        <tr key={s.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-6 py-3">
                            <span className="font-medium text-slate-900"><span className="text-blue-600">{s.subject.code}</span> — {s.subject.name}</span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{s.category}</td>
                          <td className="px-3 py-3 font-medium text-slate-800">{s.caMarks ?? '—'}</td>
                          <td className="px-3 py-3 text-slate-600">
                            {s.previousExamDate ? new Date(s.previousExamDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                            {s.previousExamIntake ? ` (${s.previousExamIntake})` : ''}
                          </td>
                          <td className="px-6 py-3 text-slate-600">{s.gradeEarned || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attachments */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
                </div>
                <div className="p-6">
                  {!app.documents || app.documents.length === 0 ? (
                    <p className="py-2 text-center text-sm text-slate-400">No attachments.</p>
                  ) : (
                    <ul className="space-y-2">
                      {app.documents.map((doc) => (
                        <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                            <FileText className="h-[18px] w-[18px]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{doc.fileName}</p>
                            <p className="text-xs text-slate-400">{DOC_TYPE_LABELS[doc.documentType]}</p>
                          </div>
                          <button
                            onClick={() => openDoc(doc.id)}
                            disabled={busyDoc === doc.id}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50"
                            title="View / download"
                          >
                            {busyDoc === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {app.remarks && app.remarks.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900">Remarks</h3>
                  </div>
                  <div className="space-y-3 p-6">
                    {app.remarks.map((r: any) => (
                      <div key={r.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm text-slate-800">{r.content}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {r.user?.staffUser?.name || r.user?.email} · {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Summary */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">Summary</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="font-medium text-slate-900">{app.type === 'MEDICAL' ? 'Medical' : 'Repeat'}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Subjects</dt><dd className="font-medium text-slate-900">{app.applicationSubjects.length}</dd></div>
                  <div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-500">Total Fee</dt><dd className="text-base font-bold text-indigo-600">{formatFee(app.totalFee)}</dd></div>
                  {app.paymentReferenceId && (
                    <div className="flex justify-between"><dt className="text-slate-500">Payment Ref</dt><dd className="truncate font-mono text-xs font-semibold text-slate-700">{app.paymentReferenceId}</dd></div>
                  )}
                </dl>
              </div>

              {/* Exam Division actions */}
              {canReview ? (
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Exam Division Review</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Verify the filled data. Forward valid applications to Finance for payment verification, or reject with a remark.
                  </p>

                  {error && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                  )}

                  {showReject && (
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      rows={3}
                      placeholder="Reason for rejection (required)…"
                      className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  )}

                  <div className="mt-4 space-y-2">
                    {!showReject ? (
                      <>
                        <button
                          onClick={() => doAction('FORWARD')}
                          disabled={acting !== null}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {acting === 'FORWARD' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Set for Finance Payment Verification
                        </button>
                        <button
                          onClick={() => { setShowReject(true); setError(''); }}
                          disabled={acting !== null}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => doAction('REJECT')}
                          disabled={acting !== null}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                          {acting === 'REJECT' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => { setShowReject(false); setError(''); setRemark(''); }}
                          disabled={acting !== null}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    {app.status === 'PAYMENT_PENDING' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-slate-400" />
                    )}
                    <h3 className="text-sm font-semibold text-slate-900">Status</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {app.status === 'SUBMITTED'
                      ? 'Awaiting Exam Division verification.'
                      : app.status === 'PAYMENT_PENDING'
                        ? 'Verified by Exam Division — awaiting Finance payment verification.'
                        : app.status === 'REJECTED'
                          ? 'This application was rejected.'
                          : `Current status: ${STATUS_LABELS[app.status] || app.status}.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </StaffShell>
  );
}
