'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartPulse, Plus, Inbox, Info, FileText, BadgeCheck, ChevronDown, Download } from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { medicalsApi, MedicalSubmission, MEDICAL_STATUS_LABELS, MEDICAL_STATUS_COLORS } from '@/lib/medicals-api';
import { fmtDateTime } from '@/lib/applications-api';
import apiClient from '@/lib/api-client';

const fmtDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const escapeHtml = (str?: string | null) =>
  str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';

const viewDocument = async (
  docId: string, fileName: string,
  approved?: boolean, serialNumber?: string | null,
  reviewedBy?: string | null, reviewedAt?: string | null,
) => {
  const res = await apiClient.get(`/documents/${docId}/download`, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  const mime = (res.data as Blob).type || '';

  if (!approved) { window.open(blobUrl, '_blank'); return; }

  // Build a viewer page with an "APPROVED" stamp overlay (visible on print too)
  const isImage = mime.startsWith('image/');
  const serial = serialNumber || '';
  const approvedBy = reviewedBy || '';
  const approvedDate = reviewedAt
    ? new Date(reviewedAt).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
};

export default function MedicalSubmissionsPage() {
  const [items, setItems] = useState<MedicalSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    medicalsApi.listMine().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) =>
    setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <StudentShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <HeartPulse className="h-6 w-6 text-rose-500" /> Medical Submission
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit your medical certificate for exams you were absent from.
          </p>
        </div>
        <Link
          href="/dashboard/student/medicals/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
        >
          <Plus className="h-4 w-4" /> New Medical Submission
        </Link>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3.5 text-xs text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p>Medical certificates must be submitted within <b>15 days</b> of the scheduled examination date, and only for the subjects you were absent from.</p>
          <p className="mt-1">Once approved, your <b>Medical Verification Serial Number</b> is assigned automatically. When you apply for the next examination, select the covered subject(s) and the serial number and verified certificate are attached for you.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Inbox className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No medical submissions yet</p>
          <p className="mt-1 text-sm text-slate-400">If you missed an exam, submit your medical certificate within 15 days.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((m) => {
            const isOpen = open.has(m.id);
            return (
              <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button onClick={() => toggle(m.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    m.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : m.status === 'REJECTED' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {m.status === 'APPROVED' ? <BadgeCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {m.items.map((i) => `${i.subject.code} — ${i.subject.name}`).join(', ')}
                      </p>
                      {m.serialNumber && (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700">
                          {m.serialNumber}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Submitted {fmtDateTime(m.submittedAt)} · {m.items.length} subject{m.items.length !== 1 ? 's' : ''} · {m.totalDays ?? '—'} day{(m.totalDays ?? 0) !== 1 ? 's' : ''} leave
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${MEDICAL_STATUS_COLORS[m.status] || 'bg-slate-100 text-slate-600'}`}>
                    {MEDICAL_STATUS_LABELS[m.status] || m.status}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Absent Exams</p>
                        <ul className="space-y-1 text-sm text-slate-700">
                          {m.items.map((i) => (
                            <li key={i.id}>
                              <span className="font-mono text-xs text-blue-600">{i.subject.code}</span> — {i.subject.name}
                              <span className="ml-1.5 text-xs text-slate-400">({fmtDay(i.examDate)})</span>
                              {i.usedByApplicationSubjectId && (
                                <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Used in an application</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Review</p>
                        {m.status === 'SUBMITTED' ? (
                          <p className="text-sm text-slate-500">Awaiting review by the Examination Division.</p>
                        ) : (
                          <div className="text-sm text-slate-700">
                            <p>{m.status === 'APPROVED' ? 'Approved' : 'Not approved'} {m.reviewedAt ? `· ${fmtDateTime(m.reviewedAt)}` : ''}</p>
                            {m.reviewRemarks && <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{m.reviewRemarks}</p>}
                          </div>
                        )}
                        {(m.documents?.length ?? 0) > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Attachments</p>
                            {m.documents!.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => viewDocument(doc.id, doc.fileName, m.status === 'APPROVED', m.serialNumber, m.reviewedBy, m.reviewedAt)}
                                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors text-left ${
                                  m.status === 'APPROVED'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-slate-200 bg-slate-50 text-blue-600 hover:bg-blue-50 hover:border-blue-200'
                                }`}
                              >
                                <Download className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate flex-1">{doc.fileName}</span>
                                {m.status === 'APPROVED' && (
                                  <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                    <BadgeCheck className="h-3 w-3" /> Approved
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </StudentShell>
  );
}
