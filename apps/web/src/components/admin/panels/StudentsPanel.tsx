'use client';

import React, { useEffect, useState } from 'react';
import {
  GraduationCap, Search, ArrowLeft, FileText, ChevronRight, ChevronDown, FileSpreadsheet, Loader2, HeartPulse, BadgeCheck, ExternalLink,
} from 'lucide-react';
import { adminApi, AdminStudent } from '@/lib/admin-api';
import { staffApi, StaffApplication } from '@/lib/staff-api';
import { medicalsApi, MedicalSubmission, MEDICAL_STATUS_LABELS, MEDICAL_STATUS_COLORS } from '@/lib/medicals-api';
import { STATUS_LABELS, STATUS_COLORS, formatFee, applicationTypeLabel, fmtDateTime } from '@/lib/applications-api';
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

const PAGE = 50;

/* ─── Student detail: info + applications ─── */
/* ─── Student detail: info + applications + medicals ─── */
function StudentDetailView({ student, onBack, onNavigate }: {
  student: AdminStudent;
  onBack: () => void;
  onNavigate: (view: string, id?: string, returnParam?: string) => void;
}) {
  const [apps, setApps] = useState<StaffApplication[]>([]);
  const [medicals, setMedicals] = useState<MedicalSubmission[]>([]);
  const [openMeds, setOpenMeds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);

  const toggleMed = (id: string) =>
    setOpenMeds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  useEffect(() => {
    Promise.all([
      staffApi.getApplications({ search: student.registrationNumber }).then(setApps).catch(() => []),
      medicalsApi.listStaff().then((list) =>
        list.filter(
          (m) =>
            m.student?.registrationNumber === student.registrationNumber ||
            (m.applicantDetails as any)?.registrationNumber === student.registrationNumber
        )
      ).then(setMedicals).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [student.registrationNumber]);

  const handleViewDoc = async (docId: string, fileName: string, m: MedicalSubmission) => {
    setBusyDoc(docId);
    try {
      await viewDocument(docId, fileName, m.status === 'APPROVED', m.serialNumber, m.reviewedBy, m.reviewedAt);
    } catch {
    } finally {
      setBusyDoc(null);
    }
  };

  return (
    <div>
      <button onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to Students
      </button>

      {/* Student info card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
        <div className="flex flex-wrap items-center gap-4 px-6 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {student.title ? `${student.title} ` : ''}{student.fullName}
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {student.registrationNumber} · {student.batchNumber} · Intake {student.intake}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
          {[
            { label: 'NIC',    value: student.nic    || '—' },
            { label: 'Mobile', value: student.mobile  || '—' },
            { label: 'Email',  value: student.email   || '—' },
            { label: 'Gender', value: student.gender  || '—' },
          ].map((f) => (
            <div key={f.label} className="bg-white px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-side split view */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Left column: Submitted Exam Applications */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <FileText className="h-5 w-5 text-blue-600" /> Submitted Exam Applications ({apps.length})
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="h-10 w-10 rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                    <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">No submitted applications</p>
              <p className="mt-1 text-xs text-slate-400">This student has not submitted any exam applications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <button key={app.id} onClick={() => onNavigate('app-detail', app.id)}
                  className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-amber-200 hover:shadow-md text-left">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${app.type === 'MEDICAL' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {applicationTypeLabel(app)} Application
                      </p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {app.applicationSubjects?.length ?? 0} subject(s) · {formatFee(app.totalFee)}
                      {app.submittedAt ? ` · Submitted ${fmtDateTime(app.submittedAt)}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-amber-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Medical Certificate Submissions */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <HeartPulse className="h-5 w-5 text-rose-500" /> Medical Certificate Submissions ({medicals.length})
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[0].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-white" />
              ))}
            </div>
          ) : medicals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <HeartPulse className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">No medical certificate submissions</p>
              <p className="mt-1 text-xs text-slate-400">This student has not submitted any medical certificates.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {medicals.map((m) => {
                const isOpen = openMeds.has(m.id);
                return (
                  <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all">
                    {/* Collapsible header */}
                    <button
                      type="button"
                      onClick={() => toggleMed(m.id)}
                      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/70"
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        m.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : m.status === 'REJECTED' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {m.status === 'APPROVED' ? <BadgeCheck className="h-4 w-4" /> : <HeartPulse className="h-4 w-4" />}
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
                          Submitted {fmtDateTime(m.submittedAt)} · {m.items.length} subject(s) · {m.totalDays ?? '—'} day(s) leave
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${MEDICAL_STATUS_COLORS[m.status] || 'bg-slate-100 text-slate-600'}`}>
                        {MEDICAL_STATUS_LABELS[m.status] || m.status}
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Collapsible content */}
                    {isOpen && (
                      <div className="border-t border-slate-100 p-4 space-y-3.5 bg-slate-50/40">
                        {/* Missed subjects list */}
                        <div>
                          <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1.5">Absent Exams</p>
                          <ul className="space-y-1.5 text-xs text-slate-700 font-medium bg-white rounded-xl border border-slate-100 p-3">
                            {m.items.map((it) => (
                              <li key={it.id} className="flex items-center gap-2">
                                <span className="font-mono text-rose-600 font-bold">{it.subject.code}</span>
                                <span>— {it.subject.name}</span>
                                <span className="text-slate-400 text-[11px]">({fmtDay(it.examDate)})</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Review details */}
                        {m.status !== 'SUBMITTED' && (
                          <div className="text-xs text-slate-500">
                            <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1">Review</p>
                            {m.status === 'APPROVED' ? (
                              <p className="text-emerald-700 font-medium">Approved by <b>{m.reviewedBy}</b> {m.reviewedAt ? `· ${fmtDateTime(m.reviewedAt)}` : ''}</p>
                            ) : (
                              <p className="text-red-600 font-medium">Not approved by <b>{m.reviewedBy}</b> {m.reviewedAt ? `· ${fmtDateTime(m.reviewedAt)}` : ''}{m.reviewRemarks ? ` — ${m.reviewRemarks}` : ''}</p>
                            )}
                          </div>
                        )}

                        {/* Certificate files */}
                        {(m.documents?.length ?? 0) > 0 && (
                          <div>
                            <p className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-1.5">Attachments</p>
                            <div className="flex flex-wrap items-center gap-2">
                              {m.documents!.map((doc) => (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => handleViewDoc(doc.id, doc.fileName, m)}
                                  disabled={busyDoc === doc.id}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    m.status === 'APPROVED'
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      : 'border-slate-200 bg-white text-blue-600 hover:bg-blue-50'
                                  }`}
                                >
                                  {busyDoc === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                                  <span>{doc.fileName}</span>
                                  {m.status === 'APPROVED' && (
                                    <span className="flex items-center gap-0.5 text-[10px] uppercase font-bold text-emerald-700">
                                      <BadgeCheck className="h-3 w-3" /> Approved
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick action button to navigate */}
                        <div className="pt-1 flex justify-end">
                          <button onClick={() => onNavigate('medicals', m.id, student.registrationNumber)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                            Open in Medicals Panel <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Students panel ─── */
interface Props {
  onNavigate: (view: string, id?: string, returnParam?: string) => void;
  initialStudentReg?: string;
}

export function StudentsPanel({ onNavigate, initialStudentReg }: Props) {
  const [items, setItems] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (initialStudentReg) {
      adminApi.listStudents({ search: initialStudentReg, take: 10 }).then((res) => {
        const found = res.items.find(
          (s) => s.registrationNumber.toLowerCase() === initialStudentReg.toLowerCase()
        ) || res.items[0];
        if (found) setSelectedStudent(found);
      }).catch(() => {});
    }
  }, [initialStudentReg]);

  // Export all students matching the current search to an .xlsx file.
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // The API caps `take` at 200 per request, so page through until we have all.
      const q = search.trim() || undefined;
      const PAGE_SIZE = 200;
      const collected: AdminStudent[] = [];
      let grandTotal = 0;
      let page = 0;
      // Guard the loop (max 1000 pages = 200k students).
      for (; page < 1000; page++) {
        const res = await adminApi.listStudents({ search: q, take: PAGE_SIZE, skip: page * PAGE_SIZE });
        grandTotal = res.total;
        collected.push(...res.items);
        if (res.items.length < PAGE_SIZE || collected.length >= grandTotal) break;
      }
      const all = { items: collected, total: grandTotal };
      const XLSX = await import('xlsx');
      const COLS: { header: string; get: (s: AdminStudent) => string }[] = [
        { header: 'Registration No', get: (s) => s.registrationNumber || '' },
        { header: 'Title',           get: (s) => s.title || '' },
        { header: 'Full Name',       get: (s) => s.fullName || '' },
        { header: 'Name with Initials', get: (s) => s.nameWithInitials || '' },
        { header: 'NIC',             get: (s) => s.nic || '' },
        { header: 'Gender',          get: (s) => s.gender || '' },
        { header: 'Batch',           get: (s) => s.batchNumber || '' },
        { header: 'Intake',          get: (s) => s.intake || '' },
        { header: 'Email',           get: (s) => s.email || '' },
        { header: 'Mobile',          get: (s) => s.mobile || '' },
        { header: 'Telephone',       get: (s) => s.telephone || '' },
        { header: 'Permanent Address', get: (s) => s.permanentAddress || '' },
        { header: 'Postal Address',  get: (s) => s.postalAddress || '' },
        { header: 'Last Login',      get: (s) => (s.lastLoginAt ? fmtDateTime(s.lastLoginAt) : 'Never') },
      ];
      const rows = all.items.map((s) => Object.fromEntries(COLS.map((c) => [c.header, c.get(s)])));
      const ws = XLSX.utils.json_to_sheet(rows, { header: COLS.map((c) => c.header) });
      ws['!cols'] = COLS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(wb, `students-${stamp}.xlsx`);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(false);
    }
  };

  const load = (reset = false) => {
    setLoading(true);
    const nextSkip = reset ? 0 : skip;
    adminApi.listStudents({ search: search.trim() || undefined, take: PAGE, skip: nextSkip })
      .then((d) => { setItems(d.items); setTotal(d.total); if (reset) setSkip(0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(() => load(true), search ? 350 : 0); return () => clearTimeout(t); }, [search]); // eslint-disable-line
  useEffect(() => { load(); }, [skip]); // eslint-disable-line

  if (selectedStudent) {
    return (
      <StudentDetailView
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <GraduationCap className="h-6 w-6 text-amber-500" /> Students
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Search the student register and click a student to view their applications.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{total.toLocaleString()} student(s)</span>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, reg no, NIC, intake…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            title={search ? 'Export students matching the current search' : 'Export all students'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
          No students found.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">Registration No</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">NIC</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Intake</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} onClick={() => setSelectedStudent(s)}
                    className="cursor-pointer border-b border-slate-50 last:border-0 transition-colors hover:bg-amber-50/40">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{s.registrationNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{s.title ? `${s.title} ` : ''}{s.fullName}</p>
                      {s.email && <p className="text-xs text-slate-400">{s.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.nic || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{s.batchNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.intake}</td>
                    <td className="px-4 py-3 text-slate-600">{s.mobile || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.lastLoginAt ? fmtDateTime(s.lastLoginAt) : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">{skip + 1}–{Math.min(skip + PAGE, total)} of {total.toLocaleString()}</span>
            <div className="flex gap-2">
              <button onClick={() => setSkip(Math.max(0, skip - PAGE))} disabled={skip === 0}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setSkip(skip + PAGE)} disabled={skip + PAGE >= total}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
