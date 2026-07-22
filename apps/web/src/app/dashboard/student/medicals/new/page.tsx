'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HeartPulse, AlertCircle, Check, Paperclip, X, Send, Info } from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { studentsApi } from '@/lib/applications-api';
import { medicalsApi, EligibleExam } from '@/lib/medicals-api';

const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function NewMedicalSubmissionPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [eligible, setEligible] = useState<EligibleExam[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set()); // key: subjectId|examDate

  const [permanentAddress, setPermanentAddress] = useState('');
  const [contactNumbers, setContactNumbers] = useState('');
  const [fileMap, setFileMap] = useState<Record<string, File | null>>({}); // key -> file
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      studentsApi.getProfile().then((p: any) => {
        setProfile(p);
        setPermanentAddress(p.permanentAddress ?? '');
        setContactNumbers([p.mobile, p.telephone].filter(Boolean).join(' / '));
      }),
      medicalsApi.eligibleExams().then(setEligible),
    ]).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  }, []);

  const keyOf = (e: EligibleExam) => `${e.subjectId}|${e.examDate}`;
  const toggle = (e: EligibleExam) => {
    const k = keyOf(e);
    setSelected((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
    setFileMap((p) => { const n = { ...p }; if (n[k]) delete n[k]; return n; });
  };

  const setFileForKey = (key: string, file: File | null) => {
    setFileMap((p) => ({ ...p, [key]: file }));
  };

  const handleSubmit = async () => {
    setError('');
    if (selected.size === 0) { setError('Select at least one exam you were absent from.'); return; }
    const missingCert = [...selected].some((k) => !fileMap[k]);
    if (missingCert) { setError('Attach a medical certificate for each selected subject.'); return; }
    if (!declared) { setError('Please confirm the declaration.'); return; }

    setSubmitting(true);
    try {
      const items = eligible.filter((e) => selected.has(keyOf(e))).map((e) => ({ subjectId: e.subjectId, examDate: e.examDate }));
      const sub = await medicalsApi.create({
        totalDays: selected.size,
        items,
        permanentAddress: permanentAddress.trim() || undefined,
        contactNumbers: contactNumbers.trim() || undefined,
      });
      for (const k of selected) { const f = fileMap[k]; if (f) await medicalsApi.uploadCertificate(sub.id, f); }
      await medicalsApi.submit(sub.id);
      router.push('/dashboard/student/medicals');
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <StudentShell>
      <Link href="/dashboard/student/medicals" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to Medical Submissions
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <HeartPulse className="h-6 w-6 text-rose-500" /> New Medical Submission
        </h1>
        <p className="mt-1 text-sm text-slate-500">Application for Submission of Medical Certificate — SAB Campus of CA Sri Lanka</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-4">


        {/* Missed exams */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">Dates of Medical Leave — Absent Exams</h2>
          <p className="mt-0.5 text-xs text-slate-500">Select the scheduled exam(s) you were absent from. Only exams within the past 15 days can be selected.</p>

          {loading ? (
            <div className="mt-4 space-y-2">{[0, 1].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : eligible.length === 0 ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>No scheduled exams are currently inside the 15-day medical submission window. If your exam was more than 15 days ago, please contact the Examination Division.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {[...eligible]
                .filter((e) => new Date(e.examDate).toDateString() !== new Date().toDateString())
                .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()).map((e) => {
                const k = keyOf(e);
                const on = selected.has(k);
                const file = fileMap[k];
                return (
                  <div key={k} className="space-y-0">
                    <button type="button" onClick={() => toggle(e)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        on ? 'border-rose-300 bg-rose-50/60 ring-1 ring-rose-200' : 'border-slate-200 bg-white hover:bg-slate-50'
                      } ${on ? 'rounded-b-none' : ''}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${on ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white'}`}>
                        {on && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">
                          <span className="text-rose-600">{e.code}</span> — {e.name}
                        </span>
                        <span className="block text-xs text-slate-400">Exam date: {fmtDay(e.examDate)}{e.intake ? ` · Intake ${e.intake}` : ''}</span>
                      </span>
                    </button>
                    {on && (
                      <div className="rounded-b-xl border border-t-0 border-rose-200 bg-rose-50/30 px-4 py-2.5">
                        {file ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 truncate text-sm font-medium text-emerald-800">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3 w-3" /></span>
                              <span className="truncate">{file.name}</span>
                            </span>
                            <button type="button" onClick={() => setFileForKey(k, null)}
                              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600">
                              <X className="h-3.5 w-3.5" /> Remove
                            </button>
                          </div>
                        ) : (
                          <label className="group flex cursor-pointer items-center gap-2.5 text-sm">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                              <Paperclip className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-medium text-rose-700">Attach certificate</span>
                            <span className="text-xs text-slate-400">(PDF, JPG or PNG · max 10MB)</span>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden"
                              onChange={(ev) => { if (ev.target.files?.[0]) setFileForKey(k, ev.target.files[0]); ev.currentTarget.value = ''; }} />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>



        {/* Declaration + submit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-0.5 h-4 w-4 accent-rose-600" />
            <span className="text-sm text-slate-700">
              I hereby declare that the above information is true and correct to the best of my knowledge. I submit the relevant
              medical certificate issued by a registered medical practitioner for consideration.
            </span>
          </label>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-50">
            <Send className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit Medical Application'}
          </button>
        </div>
      </div>
    </StudentShell>
  );
}
