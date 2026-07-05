'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Loader2, AlertCircle, FileSpreadsheet, CalendarDays, Upload, Users,
  Globe, Link2, Copy, Check, EyeOff,
} from 'lucide-react';
import {
  adminApi, AdminSchedule, AdminScheduledExam, AdminExamStaff, ExamStaffRole,
} from '@/lib/admin-api';
import { exportExamScheduleExcel } from '@/lib/export-exam-schedule';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '');
const toInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const weekdayOf = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) : '');

type StaffKey = 'chiefExaminerIds' | 'supervisorIds' | 'invigilatorIds' | 'supportingIds';
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
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');
  const [openStaff, setOpenStaff] = useState<string | null>(null); // `${examId}:${key}`
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listSchedules(), adminApi.listScheduledExams(scheduleId), adminApi.listExamStaff()])
      .then(([schedules, ex, st]) => {
        setSchedule(schedules.find((s) => s.id === scheduleId) ?? null);
        setExams(ex); setStaff(st);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [scheduleId]); // eslint-disable-line

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

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
    patch(e.id, { [field]: raw } as any);
  };
  const saveDate = (e: AdminScheduledExam, field: 'examDate' | 'revisedDate', raw: string) => {
    if (!raw) return; // clearing not supported inline
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

  const inputCls = 'w-full min-w-[70px] rounded border border-transparent bg-transparent px-1.5 py-1 text-xs focus:border-amber-400 focus:bg-white focus:outline-none hover:border-slate-200';

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
          <button onClick={addRow} disabled={adding}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Row
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
          <table className="min-w-[1500px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                {['#', 'Serial Code', 'Start At', 'ESE Date', 'Day', 'Revised', 'Intake', 'Course Code', 'Course', 'Count',
                  'Session 1', 'Session 2', 'Session 3', 'Location', 'Chief Examiner', 'Supervisor', 'Invigilator', 'Supporting', ''].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
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
              {exams.map((e, i) => (
                <tr key={e.id} className="border-t border-slate-100 align-top hover:bg-amber-50/30">
                  <td className="px-2 py-1 text-center text-[10px] font-bold text-slate-400">{i + 1}</td>
                  <td><input className={`${inputCls} font-mono`} defaultValue={e.serialCode || ''} placeholder="2026/165" onBlur={(ev) => saveText(e, 'serialCode', ev.target.value)} /></td>
                  <td><input className={inputCls} defaultValue={e.startAtLabel || ''} placeholder="28. June" onBlur={(ev) => saveText(e, 'startAtLabel', ev.target.value)} /></td>
                  <td><input type="date" className={`${inputCls} min-w-[130px]`} defaultValue={toInput(e.examDate)} onBlur={(ev) => saveDate(e, 'examDate', ev.target.value)} /></td>
                  <td className="px-2 py-1 text-[10px] text-slate-400">{e.weekday || weekdayOf(e.examDate) || '—'}</td>
                  <td><input type="date" className={`${inputCls} min-w-[130px]`} defaultValue={toInput(e.revisedDate)} onBlur={(ev) => saveDate(e, 'revisedDate', ev.target.value)} /></td>
                  <td><input className={`${inputCls} min-w-[110px]`} defaultValue={e.intake || ''} placeholder="3B WE/MOHE WE" onBlur={(ev) => saveText(e, 'intake', ev.target.value)} /></td>
                  <td><input className={`${inputCls} font-semibold`} defaultValue={e.courseCode || ''} placeholder="BMBA1212" onBlur={(ev) => saveText(e, 'courseCode', ev.target.value)} /></td>
                  <td><input className={`${inputCls} min-w-[180px]`} defaultValue={e.courseName || ''} placeholder="Course name" onBlur={(ev) => saveText(e, 'courseName', ev.target.value)} /></td>
                  <td><input type="number" className={`${inputCls} min-w-[60px]`} defaultValue={e.expectedCount ?? ''} onBlur={(ev) => saveNumber(e, ev.target.value)} /></td>
                  <td><input className={inputCls} defaultValue={e.session1 || ''} placeholder="9.00-11.30am" onBlur={(ev) => saveText(e, 'session1', ev.target.value)} /></td>
                  <td><input className={inputCls} defaultValue={e.session2 || ''} placeholder="1.00-4.00pm" onBlur={(ev) => saveText(e, 'session2', ev.target.value)} /></td>
                  <td><input className={inputCls} defaultValue={e.session3 || ''} onBlur={(ev) => saveText(e, 'session3', ev.target.value)} /></td>
                  <td><input className={`${inputCls} min-w-[150px]`} defaultValue={e.location || ''} placeholder="Location" onBlur={(ev) => saveText(e, 'location', ev.target.value)} /></td>
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
              ))}
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
    <div className="min-w-[130px]">
      <button onClick={onToggleOpen}
        className="w-full rounded border border-transparent px-1.5 py-1 text-left text-xs text-slate-600 hover:border-slate-200 hover:bg-white">
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
