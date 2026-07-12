'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Search, Printer, Loader2, Inbox, ChevronRight, X, FileSpreadsheet } from 'lucide-react';
import { staffApi, StaffApplication, AdmissionExam } from '@/lib/staff-api';
import { printAdmissionCard } from '@/lib/admission-card-pdf';
import { exportAttendanceSheet } from '@/lib/export-attendance';
import { useMyPermissions } from '@/lib/permissions';

// "Mohamed Zarook Fathima Zamnath Sahma" → "M. Z. F. Z. Sahma".
const toInitials = (nameWith?: string | null, full?: string | null) => {
  if (nameWith && nameWith.trim()) return nameWith.trim();
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return full ?? '';
  const last = parts.pop() as string;
  return `${parts.map((p) => p.charAt(0).toUpperCase() + '.').join(' ')} ${last}`;
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const longDate = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${ordinal(dt.getUTCDate())} ${dt.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })} ${dt.getUTCFullYear()}`;
};

const normCode = (c?: string | null) => (c ?? '').toUpperCase().replace(/\s+/g, '');
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).replace(/\//g, '.') : '—';

export function AdmissionsPanel() {
  const { isAdmin } = useMyPermissions();
  const [apps, setApps] = useState<StaffApplication[]>([]);
  const [exams, setExams] = useState<AdmissionExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fDate, setFDate] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [hidePrinted, setHidePrinted] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    staffApi.getAdmissions().then(setApps).catch(() => {}).finally(() => setLoading(false));
    staffApi.getAdmissionExams().then(setExams).catch(() => setExams([]));
  }, []);

  // Course code → timetable row, for the exam date per subject.
  const examByCode = useMemo(() => {
    const m = new Map<string, AdmissionExam>();
    for (const e of exams) { const k = normCode(e.courseCode); if (k && !m.has(k)) m.set(k, e); }
    return m;
  }, [exams]);
  const dateOf = (code?: string | null) => {
    const e = examByCode.get(normCode(code));
    return fmtDate(e?.revisedDate || e?.examDate);
  };

  // The subject's exam date as YYYY-MM-DD, for comparison with the date picker.
  const examISO = (code?: string | null) => {
    const e = examByCode.get(normCode(code));
    const d = e?.revisedDate || e?.examDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  };

  const subjectOptions = useMemo(() => {
    const m = new Map<string, string>();
    apps.forEach((a) => (a.applicationSubjects ?? []).forEach((s) => {
      const code = s.subject?.code; if (code) m.set(code, `${code}${s.subject?.name ? ' — ' + s.subject.name : ''}`);
    }));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [apps]);

  // A subject passes the Exam-Date filter and the typed Subject filter
  // (matches subject code or name, case-insensitive).
  const subjectMatches = (s: any) => {
    if (hidePrinted && s.admissionPrinted) return false;
    const q = fSubject.trim().toLowerCase();
    const code = (s.subject?.code ?? '').toLowerCase();
    const name = (s.subject?.name ?? '').toLowerCase();
    // Also match the "CODE — Name" label the datalist inserts on selection.
    const label = `${code}${name ? ' — ' + name : ''}`;
    const subjOk = !q || code.includes(q) || name.includes(q) || label.includes(q);
    return subjOk && (!fDate || examISO(s.subject?.code) === fDate);
  };
  // Subjects of an application that survive the active filters.
  const visibleSubs = (a: StaffApplication) => (a.applicationSubjects ?? []).filter(subjectMatches);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if ((fDate || fSubject || hidePrinted) && visibleSubs(a).length === 0) return false;
      if (!q) return true;
      return (
        (a.student?.fullName ?? '').toLowerCase().includes(q) ||
        (a.student?.registrationNumber ?? '').toLowerCase().includes(q) ||
        (a.student?.batchNumber ?? '').toLowerCase().includes(q) ||
        (a.applicationSubjects ?? []).some((s) =>
          (s.subject?.code ?? '').toLowerCase().includes(q) || (s.subject?.name ?? '').toLowerCase().includes(q))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, search, fDate, fSubject, hidePrinted, examByCode]);

  const toggle = (id: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Distinct subjects across the filtered results, each with its candidates.
  // Attendance export requires the filter to resolve to exactly one subject.
  const exportGroups = useMemo(() => {
    const m = new Map<string, { code: string; name: string; candidates: { regNo: string; name: string; nic: string }[] }>();
    for (const a of list) {
      for (const s of (a.applicationSubjects ?? []).filter(subjectMatches)) {
        const code = s.subject?.code ?? '';
        if (!m.has(code)) m.set(code, { code, name: s.subject?.name ?? '', candidates: [] });
        m.get(code)!.candidates.push({
          regNo: a.student?.registrationNumber ?? '',
          name: toInitials(a.student?.nameWithInitials, a.student?.fullName),
          nic: a.student?.nic ?? '',
        });
      }
    }
    return [...m.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, fDate, fSubject, hidePrinted, examByCode]);

  const canExport = exportGroups.length === 1;

  const doExportAttendance = async () => {
    if (!canExport) return;
    const g = exportGroups[0];
    const e = examByCode.get(normCode(g.code));
    setExporting(true);
    try {
      const prog = normCode(g.code).startsWith('BMBA')
        ? 'B.Mgt (Business Analytics) General / Special Degree Programme'
        : 'BSc. (Applied Accounting) General/Special Degree Programme';
      const eff = e?.revisedDate || e?.examDate || null;
      const monthName = (d: string) => new Date(d).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
      // Exam period = the schedule's month span (e.g. "June/July 2026"); falls
      // back to the exam's own month.
      let period = eff ? `${monthName(eff)} ${new Date(eff).getUTCFullYear()}` : '';
      if (e?.schedule?.startDate && e?.schedule?.endDate) {
        const s = e.schedule.startDate, en = e.schedule.endDate;
        const sm = monthName(s), em = monthName(en), yr = new Date(en).getUTCFullYear();
        period = sm === em ? `${sm} ${yr}` : `${sm}/${em} ${yr}`;
      }
      const time = (e?.session1 || e?.session2 || e?.session3 || '').toString();
      const dateLine = [longDate(eff), time, e?.location ? `Location : ${e.location}` : ''].filter(Boolean).join('     ');
      await exportAttendanceSheet({
        programmeTitle: prog,
        examPeriod: period,
        intake: e?.intake ?? '',
        courseLine: `${g.code} ${g.name}`.trim(),
        dateLine,
        candidates: g.candidates,
        fileName: `attendance-${normCode(g.code)}${eff ? '-' + eff.slice(0, 10) : ''}.xlsx`,
      });
    } catch (err) {
      console.error('Attendance export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const doPrint = async (app: StaffApplication, subId: string) => {
    if (printing) return;
    setPrinting(subId);
    try {
      await printAdmissionCard(app, exams, subId);
    } catch (e) {
      console.error('Admission print failed', e);
    } finally {
      setPrinting(null);
    }
  };

  // Mark/unmark a subject's admission as printed (persisted). Staff can only set
  // it printed; unmarking a printed one is admin-only (enforced server-side too).
  const togglePrinted = async (subId: string, printed: boolean) => {
    try {
      await staffApi.markAdmissionPrinted(subId, printed);
      setApps((prev) => prev.map((a) => ({
        ...a,
        applicationSubjects: (a.applicationSubjects ?? []).map((s) =>
          s.id === subId ? { ...s, admissionPrinted: printed } : s),
      })));
    } catch (e) {
      console.error('Failed to update printed status', e);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <GraduationCap className="h-6 w-6 text-emerald-500" /> Admissions
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            Approved applications — expand a row to print an admission card for each subject.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
            title="Filter by exam date"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {fDate && (
            <button
              onClick={() => setFDate('')}
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-400"
            >
              Clear date
            </button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <input
              type="checkbox"
              checked={hidePrinted}
              onChange={(e) => setHidePrinted(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Hide printed
          </label>
          <div className="relative">
            <input
              value={fSubject}
              onChange={(e) => setFSubject(e.target.value)}
              list="admission-subjects"
              placeholder="Filter by subject…"
              className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {fSubject && (
              <button
                onClick={() => setFSubject('')}
                title="Clear subject filter"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <datalist id="admission-subjects">
              {subjectOptions.map(([code, label]) => <option key={code} value={label} />)}
            </datalist>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, reg no…"
              className="w-56 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button
            onClick={doExportAttendance}
            disabled={!canExport || exporting}
            title={canExport ? 'Export attendance sheet for the filtered subject' : 'Filter to a single subject (and date) to export its attendance sheet'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Export Attendance
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-white dark:bg-gray-800" />)}</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <Inbox className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-gray-300">No approved applications</p>
          <p className="mt-1 text-sm text-slate-400">Approved applications appear here for admission-card printing.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                  <th className="px-4 py-3 text-right">#</th>
                  <th className="px-4 py-3">Serial</th>
                  <th className="px-4 py-3">Reg No</th>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-center">Subjects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {list.map((a, i) => {
                  const subs = visibleSubs(a);
                  const open = expanded.has(a.id);
                  return (
                    <React.Fragment key={a.id}>
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3 text-right text-xs text-slate-400">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.serialNumber ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-gray-300">{a.student?.registrationNumber ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{a.student?.fullName ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-gray-400">{a.student?.batchNumber ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-gray-400">{a.type === 'MEDICAL' ? 'Medical' : 'Repeat'}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggle(a.id)}
                            title="Show subjects / print admissions"
                            className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
                            {subs.length} subject{subs.length !== 1 ? 's' : ''}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50/50 dark:bg-gray-800/30">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-700">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-white text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-gray-900 dark:text-gray-500">
                                    <th className="px-4 py-2">Subject Code</th>
                                    <th className="px-4 py-2">Subject Name</th>
                                    <th className="px-4 py-2">Date of Exam</th>
                                    <th className="px-4 py-2 text-center">Printed</th>
                                    <th className="px-4 py-2 text-right">Admission</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                  {subs.map((s) => {
                                    const printed = !!s.admissionPrinted;
                                    const lockedForStaff = printed && !isAdmin; // staff can't reprint / unmark
                                    return (
                                    <tr key={s.id} className="bg-white dark:bg-gray-900">
                                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-gray-300">{s.subject?.code ?? '—'}</td>
                                      <td className="px-4 py-2.5 text-slate-700 dark:text-gray-300">{s.subject?.name ?? '—'}</td>
                                      <td className="px-4 py-2.5 text-slate-600 dark:text-gray-400">{dateOf(s.subject?.code)}</td>
                                      <td className="px-4 py-2.5 text-center">
                                        <input
                                          type="checkbox"
                                          checked={printed}
                                          disabled={lockedForStaff}
                                          onChange={(e) => togglePrinted(s.id, e.target.checked)}
                                          title={lockedForStaff ? 'Marked printed — only an admin can reset' : 'Mark as printed'}
                                          className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                                        />
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <button
                                          onClick={() => doPrint(a, s.id)}
                                          disabled={printing === s.id || lockedForStaff}
                                          title={lockedForStaff ? 'Already printed — only an admin can reprint' : 'Print admission card'}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                                        >
                                          {printing === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                                          Print Admission
                                        </button>
                                      </td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
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
      )}
    </div>
  );
}
