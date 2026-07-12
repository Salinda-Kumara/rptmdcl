'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Loader2, AlertCircle, FileSpreadsheet, CalendarDays, Upload, Users,
  Globe, Link2, Copy, Check, EyeOff,
} from 'lucide-react';
import {
  adminApi, AdminSchedule, AdminScheduledExam, AdminExamStaff, ExamStaffRole,
  AdminSubject, AdminBatch, AdminExamLocation,
} from '@/lib/admin-api';
import { exportExamScheduleExcel } from '@/lib/export-exam-schedule';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '');
const toInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const weekdayOf = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) : '');
const longDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Unscheduled / no date';

type StaffKey = 'chiefExaminerIds' | 'supervisorIds' | 'invigilatorIds' | 'supportingIds';

// Timetable columns with default (resizable) widths in px.
const GRID_COLS: { label: string; w: number; min?: number }[] = [
  { label: '#', w: 44, min: 36 },
  { label: 'Serial Code', w: 96 },
  { label: 'Start At', w: 96 },
  { label: 'ESE Date', w: 130 },
  { label: 'Day', w: 74 },
  { label: 'Revised', w: 130 },
  { label: 'Intake', w: 120 },
  { label: 'Course Code', w: 100 },
  { label: 'Course', w: 210 },
  { label: 'Count', w: 66 },
  { label: 'Session 1', w: 106 },
  { label: 'Session 2', w: 106 },
  { label: 'Session 3', w: 106 },
  { label: 'Location', w: 165 },
  { label: 'Chief Examiner', w: 155 },
  { label: 'Supervisor', w: 145 },
  { label: 'Invigilator', w: 155 },
  { label: 'Supporting', w: 135 },
  { label: '', w: 52, min: 44 },
];
const DEFAULT_WIDTHS = GRID_COLS.map((c) => c.w);

const STAFF_SLOTS: { key: StaffKey; role: ExamStaffRole; label: string }[] = [
  { key: 'chiefExaminerIds', role: 'EXAMINER',    label: 'Chief Examiner' },
  { key: 'supervisorIds',    role: 'SUPERVISOR',  label: 'Supervisor' },
  { key: 'invigilatorIds',   role: 'INVIGILATOR', label: 'Invigilator' },
  { key: 'supportingIds',    role: 'SUPPORTING',  label: 'Supporting' },
];

interface Props { scheduleId: string; onBack: () => void; }

export function ScheduleDetailPanel({ scheduleId, onBack }: Props) {
  const [schedule, setSchedule] = useState<AdminSchedule | null>(null);
  const [exams, setExams] = useState<AdminScheduledExam[]>([]);
  const [staff, setStaff] = useState<AdminExamStaff[]>([]);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [locations, setLocations] = useState<AdminExamLocation[]>([]);
  const [rowRev, setRowRev] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');
  const [openStaff, setOpenStaff] = useState<string | null>(null); // `${examId}:${key}`
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resizable columns — widths persisted across sessions.
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_WIDTHS);
  const colRefs = useRef<(HTMLTableColElement | null)[]>([]);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  useEffect(() => {
    try {
      const s = localStorage.getItem('scheduleColWidths');
      if (s) { const arr = JSON.parse(s); if (Array.isArray(arr) && arr.length === DEFAULT_WIDTHS.length) setColWidths(arr); }
    } catch { /* ignore */ }
  }, []);

  const startResize = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[idx];
    const others = totalWidth - startW;
    let lastW = startW;
    const onMove = (ev: MouseEvent) => {
      lastW = Math.max(GRID_COLS[idx].min ?? 48, startW + (ev.clientX - startX));
      if (colRefs.current[idx]) colRefs.current[idx]!.style.width = `${lastW}px`;
      if (tableRef.current) tableRef.current.style.width = `${others + lastW}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      setColWidths((prev) => {
        const n = [...prev]; n[idx] = lastW;
        try { localStorage.setItem('scheduleColWidths', JSON.stringify(n)); } catch { /* ignore */ }
        return n;
      });
    };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  const resetWidths = () => { setColWidths(DEFAULT_WIDTHS); try { localStorage.removeItem('scheduleColWidths'); } catch { /* ignore */ } };

  const publicUrl = schedule?.publicToken && typeof window !== 'undefined'
    ? `${window.location.origin}/schedule/${schedule.publicToken}`
    : '';

  const doPublish = async () => {
    setPublishing(true);
    try {
      const updated = await adminApi.publishSchedule(scheduleId);
      setSchedule((s) => (s ? { ...s, ...updated } : updated));
    } catch (e: any) { setMsg(e.response?.data?.message?.toString() || 'Publish failed'); }
    finally { setPublishing(false); }
  };
  const doUnpublish = async () => {
    if (!confirm('Unpublish this schedule? The public link will stop working.')) return;
    setPublishing(true);
    try {
      const updated = await adminApi.unpublishSchedule(scheduleId);
      setSchedule((s) => (s ? { ...s, ...updated } : updated));
    } catch (e: any) { setMsg(e.response?.data?.message?.toString() || 'Unpublish failed'); }
    finally { setPublishing(false); }
  };
  const copyLink = async () => {
    if (!publicUrl) return;
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  // "Enable for apply" — student applications auto-fill exam date/intake from this schedule.
  const [togglingApply, setTogglingApply] = useState(false);
  const toggleApplyEnabled = async () => {
    if (!schedule) return;
    setTogglingApply(true);
    try {
      const updated = await adminApi.setScheduleApplyEnabled(scheduleId, !schedule.applyEnabled);
      setSchedule((s) => (s ? { ...s, ...updated } : updated));
    } catch (e: any) { setMsg(e.response?.data?.message?.toString() || 'Failed to update apply setting'); }
    finally { setTogglingApply(false); }
  };

  const load = () => {
    setLoading(true);
    // Core timetable — keep this independent of the staff-directory call so a
    // missing secondary permission can't blank the schedule.
    Promise.all([adminApi.listSchedules(), adminApi.listScheduledExams(scheduleId)])
      .then(([schedules, ex]) => {
        setSchedule(schedules.find((s) => s.id === scheduleId) ?? null);
        setExams(ex);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    adminApi.listExamStaff().then(setStaff).catch(() => {});
  };
  useEffect(load, [scheduleId]); // eslint-disable-line

  // Reference data for autocomplete (subjects, batches, locations) — loaded once.
  useEffect(() => {
    adminApi.listSubjects().then(setSubjects).catch(() => {});
    adminApi.listBatches().then(setBatches).catch(() => {});
    adminApi.listExamLocations().then(setLocations).catch(() => {});
  }, []);

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const normCode = (c: string) => c.replace(/\s+/g, '').toLowerCase();
  const subjectByCode = useMemo(() => new Map(subjects.map((s) => [normCode(s.code), s])), [subjects]);
  const subjectByName = useMemo(() => new Map(subjects.map((s) => [s.name.trim().toLowerCase(), s])), [subjects]);
  // Distinct intakes: batch intakes + any already used in this schedule.
  const intakeOptions = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => b.intake && set.add(b.intake));
    exams.forEach((e) => e.intake && set.add(e.intake));
    return [...set].sort();
  }, [batches, exams]);
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((l) => set.add(l.name));
    exams.forEach((e) => e.location && set.add(e.location));
    return [...set].sort();
  }, [locations, exams]);

  const bumpRow = (id: string) => setRowRev((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }));

  const patch = async (id: string, data: Partial<AdminScheduledExam>) => {
    try {
      const updated = await adminApi.updateScheduledExam(id, data as any);
      setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    } catch (e: any) {
      setMsg(e.response?.data?.message?.toString() || 'Save failed');
    }
  };

  // Save a text/date/number field on blur, only if it actually changed.
  const saveText = (e: AdminScheduledExam, field: keyof AdminScheduledExam, raw: string) => {
    const cur = (e[field] as any) ?? '';
    if (String(cur) === raw) return;
    // Course Code → auto-fill the Course name from the matching subject.
    if (field === 'courseCode' && raw.trim()) {
      const match = subjectByCode.get(normCode(raw));
      if (match && match.name !== e.courseName) {
        patch(e.id, { courseCode: raw, courseName: match.name } as any).then(() => bumpRow(e.id));
        return;
      }
    }
    // Course Name → auto-fill the Course code from the matching subject.
    if (field === 'courseName' && raw.trim()) {
      const match = subjectByName.get(raw.trim().toLowerCase());
      if (match && normCode(match.code) !== normCode(e.courseCode || '')) {
        patch(e.id, { courseName: raw, courseCode: match.code } as any).then(() => bumpRow(e.id));
        return;
      }
    }
    patch(e.id, { [field]: raw } as any);
  };
  const saveDate = (e: AdminScheduledExam, field: 'examDate' | 'revisedDate', raw: string) => {
    if (!raw) {
      // Emptying the field clears the stored date.
      if (e[field]) patch(e.id, { [field]: null } as any);
      return;
    }
    if (toInput(e[field]) === raw) return;
    patch(e.id, { [field]: raw } as any);
  };
  const saveNumber = (e: AdminScheduledExam, raw: string) => {
    const val = raw === '' ? undefined : Number(raw);
    if ((e.expectedCount ?? undefined) === val) return;
    patch(e.id, { expectedCount: val } as any);
  };

  const toggleStaff = async (e: AdminScheduledExam, key: StaffKey, staffId: string) => {
    const cur = (e[key] as string[]) || [];
    const next = cur.includes(staffId) ? cur.filter((x) => x !== staffId) : [...cur, staffId];
    await patch(e.id, { [key]: next } as any);
  };

  const addRow = async () => {
    setAdding(true);
    try {
      const created = await adminApi.createScheduledExam(scheduleId, { orderIndex: exams.length });
      setExams((prev) => [...prev, created]);
    } catch (err: any) { setMsg(err.response?.data?.message?.toString() || 'Could not add row'); }
    finally { setAdding(false); }
  };

  const removeRow = async (e: AdminScheduledExam) => {
    if (!confirm('Delete this exam row?')) return;
    await adminApi.deleteScheduledExam(e.id);
    setExams((prev) => prev.filter((x) => x.id !== e.id));
  };

  const doImport = async (file: File) => {
    setMsg('');
    const replace = exams.length > 0
      ? confirm(`Replace the ${exams.length} existing row(s) with the file's contents?\n\nOK = replace, Cancel = append.`)
      : false;
    setImporting(true);
    try {
      const r = await adminApi.importScheduledExams(scheduleId, file, replace);
      setMsg(`Imported ${r.created} exam(s)${r.staffCreated ? `, added ${r.staffCreated} new staff` : ''}.`);
      load();
    } catch (e: any) { setMsg(e.response?.data?.message?.toString() || 'Import failed'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const doExport = async () => {
    if (!schedule || exporting) return;
    setExporting(true);
    try { await exportExamScheduleExcel(schedule, exams, staff); }
    catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  // Group by the effective date — the revised date takes precedence over the ESE date.
  const groupKey = (x: AdminScheduledExam) => (x.revisedDate ? toInput(x.revisedDate) : x.examDate ? toInput(x.examDate) : 'none');
  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of exams) m.set(groupKey(e), (m.get(groupKey(e)) || 0) + 1);
    return m;
  }, [exams]);

  const inputCls = 'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-100/70 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100';

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Back to Schedules
        </button>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-100 disabled:opacity-50">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import Excel
          </button>
          <button onClick={doExport} disabled={exporting || exams.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 disabled:opacity-50">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Export Excel
          </button>
          {schedule?.published ? (
            <button onClick={doUnpublish} disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />} Unpublish
            </button>
          ) : (
            <button onClick={doPublish} disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Publish
            </button>
          )}
          {/* Enable for apply — students' applications auto-fill from this schedule */}
          <button
            type="button"
            onClick={toggleApplyEnabled}
            disabled={togglingApply || !schedule}
            title="When enabled, students applying for repeat/medical get the upcoming exam date and intake auto-filled from this schedule"
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 ${
              schedule?.applyEnabled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                schedule?.applyEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                  schedule?.applyEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
            {togglingApply ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enable for apply
          </button>
        </div>
      </div>

      {schedule?.published && publicUrl && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
          <Globe className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-800">Published · anyone with this link can view (read-only):</span>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate text-xs font-medium text-indigo-700 underline hover:text-indigo-900">
            <Link2 className="h-3.5 w-3.5 shrink-0" /> {publicUrl}
          </a>
          <button onClick={copyLink} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><CalendarDays className="h-5 w-5" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">{schedule?.name || 'Schedule'}</h1>
          {schedule && <p className="mt-0.5 text-xs text-slate-500">{fmtDate(schedule.startDate)} → {fmtDate(schedule.endDate)} · {exams.length} exam{exams.length !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      {msg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
          <AlertCircle className="h-4 w-4 shrink-0" /> {msg}
        </div>
      )}

      {staff.length === 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <Users className="h-4 w-4 shrink-0" /> No exam staff yet — add people under <b>Exam Staff</b> to assign them here.
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white" />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Autocomplete sources */}
          <datalist id="dl-courses">
            {subjects.map((s) => <option key={s.id} value={s.code}>{s.name}</option>)}
          </datalist>
          <datalist id="dl-course-names">
            {subjects.map((s) => <option key={s.id} value={s.name}>{s.code}</option>)}
          </datalist>
          <datalist id="dl-intakes">
            {intakeOptions.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="dl-locations">
            {locationOptions.map((v) => <option key={v} value={v} />)}
          </datalist>
          <div className="flex justify-end border-b border-slate-100 px-3 py-1.5">
            <button onClick={resetWidths} className="text-[10px] font-medium text-slate-400 hover:text-slate-700">Reset column widths</button>
          </div>
          <table ref={tableRef} className="table-fixed border-collapse text-xs [&_td]:border [&_td]:border-slate-200/70 [&_th]:border [&_th]:border-slate-200" style={{ width: totalWidth }}>
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={i} ref={(el) => { colRefs.current[i] = el; }} style={{ width: w }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 text-left">
                {GRID_COLS.map((c, i) => (
                  <th key={i} className="relative select-none px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="block truncate">{c.label}</span>
                    {i < GRID_COLS.length - 1 && (
                      <span
                        onMouseDown={(e) => startResize(i, e)}
                        title="Drag to resize"
                        className="group absolute -right-[3px] top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center"
                      >
                        <span className="h-3.5 w-px bg-slate-300 group-hover:bg-indigo-500" />
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 && (
                <tr>
                  <td colSpan={19} className="px-4 py-10 text-center text-sm text-slate-400">
                    No exams yet — click <b className="text-slate-600">Add Row</b> to type them in, or <b className="text-slate-600">Import Excel</b> to load a sheet.
                  </td>
                </tr>
              )}
              {exams.map((e, i) => {
                const showBand = i === 0 || groupKey(e) !== groupKey(exams[i - 1]);
                const count = groupCounts.get(groupKey(e)) ?? 0;
                return (
                <React.Fragment key={`${e.id}:${rowRev[e.id] ?? 0}`}>
                {showBand && (
                  <tr>
                    <td colSpan={GRID_COLS.length} style={{ border: 'none', borderTop: i === 0 ? 'none' : '6px solid #f8fafc', borderBottom: '1px solid #e2e8f0' }}
                      className="bg-slate-50/80 px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3.5 w-1 rounded-full bg-indigo-400" />
                        <span className="text-[11px] font-semibold text-slate-600">{longDate(e.revisedDate || e.examDate)}</span>
                        {e.revisedDate && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Revised</span>}
                        <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{count} exam{count !== 1 ? 's' : ''}</span>
                      </span>
                    </td>
                  </tr>
                )}
                <tr className="align-top transition-colors hover:bg-indigo-50/40">
                  <td className="px-2 py-1.5 text-center text-[11px] font-medium text-slate-400">{i + 1}</td>
                  <td><input className={`${inputCls} font-mono`} defaultValue={e.serialCode || ''} placeholder="2026/165" onBlur={(ev) => saveText(e, 'serialCode', ev.target.value)} /></td>
                  <td><input className={inputCls} defaultValue={e.startAtLabel || ''} placeholder="28. June" onBlur={(ev) => saveText(e, 'startAtLabel', ev.target.value)} /></td>
                  <td><input type="date" className={inputCls} defaultValue={toInput(e.examDate)} onBlur={(ev) => saveDate(e, 'examDate', ev.target.value)} /></td>
                  <td className="px-2 py-1 text-[10px] text-slate-400">{e.weekday || weekdayOf(e.examDate) || '—'}</td>
                  <td><input type="date" className={inputCls} defaultValue={toInput(e.revisedDate)} onBlur={(ev) => saveDate(e, 'revisedDate', ev.target.value)} /></td>
                  <td><input list="dl-intakes" className={inputCls} defaultValue={e.intake || ''} placeholder="3B WE/MOHE WE" onBlur={(ev) => saveText(e, 'intake', ev.target.value)} /></td>
                  <td><input list="dl-courses" className={`${inputCls} font-semibold`} defaultValue={e.courseCode || ''} placeholder="BMBA1212" onBlur={(ev) => saveText(e, 'courseCode', ev.target.value)} /></td>
                  <td><input list="dl-course-names" className={inputCls} defaultValue={e.courseName || ''} placeholder="Course name" onBlur={(ev) => saveText(e, 'courseName', ev.target.value)} /></td>
                  <td><input type="number" className={inputCls} defaultValue={e.expectedCount ?? ''} onBlur={(ev) => saveNumber(e, ev.target.value)} /></td>
                  <td><input className={inputCls} defaultValue={e.session1 || ''} placeholder="9.00-11.30am" onBlur={(ev) => saveText(e, 'session1', ev.target.value)} /></td>
                  <td><input className={inputCls} defaultValue={e.session2 || ''} placeholder="1.00-4.00pm" onBlur={(ev) => saveText(e, 'session2', ev.target.value)} /></td>
                  <td><input className={inputCls} defaultValue={e.session3 || ''} onBlur={(ev) => saveText(e, 'session3', ev.target.value)} /></td>
                  <td><input list="dl-locations" className={inputCls} defaultValue={e.location || ''} placeholder="Location" onBlur={(ev) => saveText(e, 'location', ev.target.value)} /></td>
                  {STAFF_SLOTS.map((slot) => (
                    <td key={slot.key} className="relative px-1 py-1">
                      <StaffCell
                        exam={e} slot={slot} staff={staff} staffById={staffById}
                        open={openStaff === `${e.id}:${slot.key}`}
                        onToggleOpen={() => setOpenStaff((cur) => (cur === `${e.id}:${slot.key}` ? null : `${e.id}:${slot.key}`))}
                        onPick={(sid) => toggleStaff(e, slot.key, sid)}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <button onClick={() => removeRow(e)} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
                </React.Fragment>
                );
              })}
              {/* Add-row line — "+" in the # column */}
              <tr className="hover:bg-amber-50/40">
                <td className="px-2 py-1.5 text-center">
                  <button onClick={addRow} disabled={adding} title="Add row"
                    className="mx-auto flex h-5 w-5 items-center justify-center rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
                    {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                </td>
                <td colSpan={GRID_COLS.length - 1} style={{ border: 'none' }}>
                  <button onClick={addRow} disabled={adding} className="px-3 py-1.5 text-left text-xs font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50">
                    Add row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Staff picker cell: shows chosen names; click to open a checklist popover ── */
function StaffCell({
  exam, slot, staff, staffById, open, onToggleOpen, onPick,
}: {
  exam: AdminScheduledExam;
  slot: { key: StaffKey; role: ExamStaffRole; label: string };
  staff: AdminExamStaff[];
  staffById: Map<string, AdminExamStaff>;
  open: boolean;
  onToggleOpen: () => void;
  onPick: (staffId: string) => void;
}) {
  const selected = (exam[slot.key] as string[]) || [];
  const pool = staff.filter((s) => s.role === slot.role);
  const names = selected.map((id) => staffById.get(id)?.name).filter(Boolean);

  return (
    <div className="w-full">
      <button onClick={onToggleOpen} title={names.join(', ')}
        className="block w-full truncate rounded border border-transparent px-1.5 py-1 text-left text-xs text-slate-600 hover:border-slate-200 hover:bg-white">
        {names.length ? names.join(', ') : <span className="text-slate-300">— pick —</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggleOpen} />
          <div className="absolute z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{slot.label}</p>
            {pool.length === 0 ? (
              <p className="px-2 py-2 text-[11px] italic text-slate-400">None in directory. Add under Exam Staff.</p>
            ) : pool.map((p) => {
              const on = selected.includes(p.id);
              return (
                <button key={p.id} onClick={() => onPick(p.id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${on ? 'bg-amber-50 text-amber-800' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'}`}>
                    {on && <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
