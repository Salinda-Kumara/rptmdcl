'use client';

import React, { useEffect, useState } from 'react';
import {
  GraduationCap, Search, ArrowLeft, FileText, ChevronRight, FileSpreadsheet, Loader2,
} from 'lucide-react';
import { adminApi, AdminStudent } from '@/lib/admin-api';
import { staffApi, StaffApplication } from '@/lib/staff-api';
import { STATUS_LABELS, STATUS_COLORS, formatFee, applicationTypeLabel, fmtDateTime } from '@/lib/applications-api';

const PAGE = 50;

/* ─── Student detail: info + applications ─── */
function StudentDetailView({ student, onBack, onNavigateApp }: {
  student: AdminStudent;
  onBack: () => void;
  onNavigateApp: (id: string) => void;
}) {
  const [apps, setApps] = useState<StaffApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffApi.getApplications({ search: student.registrationNumber })
      .then(setApps).catch(() => {}).finally(() => setLoading(false));
  }, [student.registrationNumber]);

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

      {/* Applications */}
      <h2 className="mb-3 text-base font-semibold text-slate-900">Submitted Applications</h2>
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
          <p className="mt-1 text-xs text-slate-400">This student has not submitted any applications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <button key={app.id} onClick={() => onNavigateApp(app.id)}
              className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-amber-200 hover:shadow-md text-left">
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
  );
}

/* ─── Main Students panel ─── */
interface Props { onNavigate: (view: string, id?: string) => void; }

export function StudentsPanel({ onNavigate }: Props) {
  const [items, setItems] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [exporting, setExporting] = useState(false);

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
        onNavigateApp={(id) => onNavigate('app-detail', id)}
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
