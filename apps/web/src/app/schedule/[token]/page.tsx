'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { CalendarDays, AlertCircle, Loader2, MapPin } from 'lucide-react';

interface PublicExam {
  id: string;
  serialCode?: string | null;
  startAtLabel?: string | null;
  examDate?: string | null;
  weekday?: string | null;
  revisedDate?: string | null;
  intake?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
  expectedCount?: number | null;
  session1?: string | null;
  session2?: string | null;
  session3?: string | null;
  location?: string | null;
  chiefExaminers: string[];
  supervisors: string[];
  invigilators: string[];
  supporting: string[];
}
interface PublicSchedule {
  name: string;
  startDate: string;
  endDate: string;
  description?: string | null;
  publishedAt?: string | null;
  exams: PublicExam[];
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '');
const longDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Unscheduled';
const sessions = (e: PublicExam) => [e.session1, e.session2, e.session3].filter(Boolean).join(' · ');

export default function PublicSchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<PublicSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/public/schedules/${token}`)
      .then((r) => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(setData)
      .catch(() => setError('This schedule is not available. It may be unpublished or the link is incorrect.'))
      .finally(() => setLoading(false));
  }, [token]);

  const groups = useMemo(() => {
    const map = new Map<string, PublicExam[]>();
    for (const e of data?.exams ?? []) {
      const key = e.examDate || e.revisedDate || 'Unscheduled';
      const bucket = e.examDate ? new Date(e.examDate).toISOString().slice(0, 10) : e.revisedDate ? new Date(e.revisedDate).toISOString().slice(0, 10) : 'z';
      const gk = `${bucket}::${key}`;
      if (!map.has(gk)) map.set(gk, []);
      map.get(gk)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-slate-300" />
        <p className="max-w-md text-sm font-medium text-slate-500">{error || 'Schedule not found.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 text-indigo-300">
            <CalendarDays className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Examination Schedule</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{data.name}</h1>
          <p className="mt-1 text-sm text-indigo-200">
            {fmt(data.startDate)} – {fmt(data.endDate)} · {data.exams.length} exam{data.exams.length !== 1 ? 's' : ''}
          </p>
          {data.description && <p className="mt-2 max-w-2xl text-sm text-indigo-200/80">{data.description}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {groups.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-400">No exams have been added yet.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {groups.map(([gk, rows]) => (
              <section key={gk} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-amber-100 bg-amber-50 px-5 py-3">
                  <p className="text-sm font-bold text-amber-900">{longDate(rows[0].examDate || rows[0].revisedDate)}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {rows.map((e) => (
                    <div key={e.id} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-12 sm:items-start">
                      <div className="sm:col-span-4">
                        <p className="text-sm font-semibold text-slate-900">
                          <span className="text-indigo-600">{e.courseCode}</span>{e.courseName ? ` — ${e.courseName}` : ''}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {e.intake && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{e.intake}</span>}
                          {e.serialCode && <span className="font-mono">#{e.serialCode}</span>}
                          {e.expectedCount != null && <span>{e.expectedCount} students</span>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 sm:col-span-3">
                        {sessions(e) && <p className="font-medium text-slate-800">{sessions(e)}</p>}
                        {e.location && <p className="mt-0.5 flex items-center gap-1 text-slate-500"><MapPin className="h-3 w-3 shrink-0" /> {e.location}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:col-span-5">
                        <StaffLine label="Chief Examiner" names={e.chiefExaminers} />
                        <StaffLine label="Supervisor" names={e.supervisors} />
                        <StaffLine label="Invigilator" names={e.invigilators} />
                        <StaffLine label="Supporting" names={e.supporting} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          {data.publishedAt ? `Published ${new Date(data.publishedAt).toLocaleString('en-GB')}` : ''} · Read-only view
        </p>
      </div>
    </div>
  );
}

function StaffLine({ label, names }: { label: string; names: string[] }) {
  if (!names || names.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xs text-slate-700">{names.join(', ')}</p>
    </div>
  );
}
