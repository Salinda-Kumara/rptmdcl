'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Check,
  UserCheck,
  Info,
  Search,
  Plus,
  X,
  Paperclip,
} from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { applicationsApi, studentsApi, documentsApi, Subject, ApplicantDetails, ScheduledExamInfo } from '@/lib/applications-api';
import apiClient from '@/lib/api-client';

type Category = 'REPEAT' | 'MEDICAL' | '1ST_ATTEMPT';

interface SelectedSubject {
  subjectId: string;
  // Empty until the student picks a category (the dropdown starts unselected).
  category: Category | '';
  caMarks: string;
  upcomingExamIntake: string;
  upcomingExamDate: string;
  previousExamDate: string;
  previousExamIntake: string;
  gradeEarned: string;
  // Medical-category subjects require a certificate, attached here and uploaded
  // after the draft is created.
  medicalCertificate?: File;
}

// Bank payment details from the physical form
const BANK_DETAILS = {
  name: 'The Institute of Chartered Accountants of Sri Lanka - SAB',
  bank: 'Sampath Bank',
  branch: 'Borella',
  account: '000460002370',
};

// Per-subject fee by category (LKR). Repeat is the discounted rate; Medical and
// 1st-Attempt re-sits are charged the higher rate.
const FEES: Record<Category, number> = { REPEAT: 2600, MEDICAL: 5200, '1ST_ATTEMPT': 5200 };
const STEPS = ['Your Details', 'Subjects', 'Review'];

// All personal details are editable for this application only.
interface ApplicantForm {
  fullName: string;
  nameWithInitials: string;
  registrationNumber: string;
  nic: string;
  batchNumber: string;
  intake: string;
  permanentAddress: string;
  postalAddress: string;
  telephone: string;
  mobile: string;
  email: string;
}

const EMPTY_APPLICANT: ApplicantForm = {
  fullName: '',
  nameWithInitials: '',
  registrationNumber: '',
  nic: '',
  batchNumber: '',
  intake: '',
  permanentAddress: '',
  postalAddress: '',
  telephone: '',
  mobile: '',
  email: '',
};

// The category is chosen per subject. Each subject may independently be a
// Repeat, Medical re-sit, or 1st-Attempt re-sit.
const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'REPEAT', label: 'Repeat' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: '1ST_ATTEMPT', label: '1st Attempt' },
];

// The category dropdown starts with no selection — the student must choose.
const DEFAULT_CATEGORY = '' as const;

// Per-subject fee; 0 while no category is chosen yet.
const feeForCategory = (category: Category | ''): number => (category ? FEES[category] : 0);

function generateInitials(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName.trim();
  const lastName = parts.pop();
  const initials = parts.map(p => p.charAt(0).toUpperCase() + '.').join(' ');
  return `${initials} ${lastName}`;
}

export default function NewApplicationPage() {
  const router = useRouter();

  // Today in Sri Lanka (Asia/Colombo), YYYY-MM-DD — caps date fields that can't
  // be in the future (e.g. a previous exam date).
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Once the student tries to continue, missing fields are highlighted in red.
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<SelectedSubject[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [scheduledExams, setScheduledExams] = useState<ScheduledExamInfo[]>([]);
  const [batchList, setBatchList] = useState<string[]>([]);
  const [subjectSearch, setSubjectSearch] = useState('');

  // Personal details (pre-filled from the student record; corrections here are
  // saved only on this application, never written back to the master record).
  const [applicant, setApplicant] = useState<ApplicantForm>(EMPTY_APPLICANT);
  const [programme, setProgramme] = useState<string>('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    studentsApi.getSubjects()
      .then(setSubjects)
      .catch(() => setError('Failed to load subjects'))
      .finally(() => setLoadingSubjects(false));

    studentsApi.getScheduledExams().then(setScheduledExams).catch(() => {});

    // Batch/intake list for the "Intake Details" autosuggest.
    apiClient.get<string[]>('/auth/batches').then((r) => setBatchList(r.data)).catch(() => {});

    studentsApi.getProfile()
      .then((p: any) => {
        const loadedFullName = (p.fullName ?? '').toUpperCase();
        setApplicant({
          fullName: loadedFullName,
          nameWithInitials: p.nameWithInitials || generateInitials(loadedFullName),
          registrationNumber: p.registrationNumber ?? '',
          nic: p.nic ?? '',
          batchNumber: p.batchNumber ?? '',
          intake: p.intake ?? '',
          permanentAddress: p.permanentAddress ?? '',
          postalAddress: p.postalAddress ?? '',
          telephone: p.telephone ?? '',
          mobile: p.mobile ?? '',
          email: p.email ?? '',
        });
        setProgramme(p.batch?.programme?.name ?? '');
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const updateApplicant = (field: keyof ApplicantForm, value: string) =>
    setApplicant((prev) => ({ ...prev, [field]: value }));

  const validateDetails = () => {
    if (!applicant.fullName.trim()) { setError('Full name is required'); return false; }
    if (!applicant.registrationNumber.trim()) { setError('Registration number is required'); return false; }
    if (!applicant.nic.trim()) { setError('NIC / Passport number is required'); return false; }
    if (!applicant.mobile.trim()) { setError('Mobile number is required'); return false; }
    if (!applicant.email.trim()) { setError('Email is required'); return false; }
    if (!applicant.permanentAddress.trim()) { setError('Permanent address is required'); return false; }
    setError('');
    return true;
  };

  const [savingDetails, setSavingDetails] = useState(false);
  // On "Confirm & Continue": persist ONLY permanent address, mobile and email to
  // the master student record. All other edits stay on this application only.
  const continueFromDetails = async () => {
    if (!validateDetails()) return;
    setSavingDetails(true);
    try {
      await studentsApi.updateContact({
        permanentAddress: applicant.permanentAddress.trim(),
        mobile: applicant.mobile.trim(),
        email: applicant.email.trim(),
      });
    } catch {
      // Best-effort — the application snapshot still carries the values.
    } finally {
      setSavingDetails(false);
    }
    setStep(2);
  };

  const emptySubject = (subjectId: string): SelectedSubject => ({
    subjectId,
    category: DEFAULT_CATEGORY,
    caMarks: '',
    upcomingExamIntake: '',
    upcomingExamDate: '',
    previousExamDate: '',
    previousExamIntake: '',
    gradeEarned: '',
  });

  // Prefer the revised date, else the original exam date, as a yyyy-mm-dd string.
  const scheduleDate = (e: ScheduledExamInfo): string => {
    const d = e.revisedDate ?? e.examDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  };

  // Match a subject to a published timetable row by course code (spaces/case are
  // ignored). Only rows whose exam date is still UPCOMING (today or later) are
  // used — a passed exam date is not auto-filled. Prefer the student's own intake.
  const normCode = (c?: string | null) => (c ?? '').toUpperCase().replace(/\s+/g, '');
  const scheduleForSubject = (subject: Subject): ScheduledExamInfo | null => {
    const code = normCode(subject.code);
    // Today's date in Sri Lanka (Asia/Colombo), so the "passed exam" cutoff
    // follows local date rather than UTC. en-CA formats as YYYY-MM-DD.
    const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
    const matches = scheduledExams.filter(
      (e) => normCode(e.courseCode) === code && scheduleDate(e) && scheduleDate(e) >= todayISO,
    );
    if (!matches.length) return null;
    const myIntake = (applicant.intake || applicant.batchNumber || '').toLowerCase().trim();
    if (myIntake) {
      const token = myIntake.split(/[\/\s]/)[0]; // e.g. "3B" from "3B WE/MOHE WE"
      const pref = matches.find((e) => (e.intake ?? '').toLowerCase().includes(token) && token.length > 1);
      if (pref) return pref;
    }
    // Earliest upcoming date first.
    return [...matches].sort((a, b) => scheduleDate(a).localeCompare(scheduleDate(b)))[0];
  };

  const toggleSubject = (subjectId: string) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.subjectId === subjectId);
      if (exists) return prev.filter((s) => s.subjectId !== subjectId);
      // On select, auto-fill the upcoming exam intake + date from the schedule.
      const base = emptySubject(subjectId);
      const subject = subjects.find((s) => s.id === subjectId);
      const sched = subject ? scheduleForSubject(subject) : null;
      if (sched) {
        base.upcomingExamIntake = sched.intake ?? '';
        base.upcomingExamDate = scheduleDate(sched);
      }
      return [...prev, base];
    });
  };

  const updateField = (subjectId: string, field: keyof SelectedSubject, value: string) => {
    setSelected((prev) =>
      prev.map((s) => (s.subjectId === subjectId ? { ...s, [field]: value } : s))
    );
  };

  const setCertificate = (subjectId: string, file: File | undefined) => {
    setSelected((prev) =>
      prev.map((s) => (s.subjectId === subjectId ? { ...s, medicalCertificate: file } : s))
    );
  };

  // Per-subject missing/invalid fields, keyed by field name — drives the inline
  // red highlighting once the student has attempted to continue.
  const subjectFieldErrors = (s: SelectedSubject): Set<keyof SelectedSubject> => {
    const e = new Set<keyof SelectedSubject>();
    if (!s.category) e.add('category');
    if (s.caMarks === '' || s.caMarks === undefined) e.add('caMarks');
    if (!s.upcomingExamIntake.trim()) e.add('upcomingExamIntake');
    if (!s.upcomingExamDate || s.upcomingExamDate < todayISO) e.add('upcomingExamDate');
    if (!s.previousExamDate || s.previousExamDate > todayISO) e.add('previousExamDate');
    if (!s.previousExamIntake.trim()) e.add('previousExamIntake');
    if (s.category === 'REPEAT' && !s.gradeEarned.trim()) e.add('gradeEarned');
    if (s.category === 'MEDICAL' && !s.medicalCertificate) e.add('medicalCertificate');
    return e;
  };

  const validateStep2 = () => {
    if (selected.length === 0) { setError('Select at least one subject'); return false; }
    setShowFieldErrors(true);
    for (const s of selected) {
      const code = subjects.find((subj) => subj.id === s.subjectId)?.code ?? 'subject';
      if (!s.category) { setError(`Select a category (${code})`); return false; }
      if (s.caMarks === '' || s.caMarks === undefined) { setError(`CA Marks are required (${code})`); return false; }
      if (!s.upcomingExamIntake.trim()) { setError(`Upcoming Exam Intake is required (${code})`); return false; }
      if (!s.upcomingExamDate) { setError(`Upcoming Exam Date is required (${code})`); return false; }
      if (s.upcomingExamDate < todayISO) { setError(`Upcoming Exam Date cannot be in the past (${code})`); return false; }
      if (!s.previousExamDate) { setError(`Date of Previous Exam is required (${code})`); return false; }
      if (s.previousExamDate > todayISO) { setError(`Date of Previous Exam cannot be in the future (${code})`); return false; }
      if (!s.previousExamIntake.trim()) { setError(`Previous exam Intake Details are required (${code})`); return false; }
      if (s.category === 'REPEAT' && !s.gradeEarned.trim()) { setError(`Grade Earned is required (${code})`); return false; }
      if (s.category === 'MEDICAL' && !s.medicalCertificate) { setError(`A medical certificate is required (${code})`); return false; }
    }
    setError('');
    return true;
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError('');
    try {
      const app = await applicationsApi.create({
        applicant: applicant as ApplicantDetails,
        subjects: selected.map((s) => ({
          subjectId: s.subjectId,
          category: s.category as any,
          caMarks: Number(s.caMarks),
          upcomingExamIntake: s.upcomingExamIntake || undefined,
          upcomingExamDate: s.upcomingExamDate || undefined,
          previousExamDate: s.previousExamDate || undefined,
          previousExamIntake: s.previousExamIntake || undefined,
          gradeEarned: s.gradeEarned || undefined,
        })),
      });

      // Upload each medical subject's certificate against its created
      // application-subject. Match created subjects back by subjectId.
      const certUploads = selected
        .filter((s) => s.category === 'MEDICAL' && s.medicalCertificate)
        .map((s) => {
          const created = app.applicationSubjects.find((as) => as.subjectId === s.subjectId);
          if (!created) return null;
          return documentsApi.upload(app.id, 'MEDICAL_CERTIFICATE', s.medicalCertificate!, created.id);
        })
        .filter((p): p is ReturnType<typeof documentsApi.upload> => p !== null);
      if (certUploads.length) await Promise.all(certUploads);

      router.push(`/dashboard/student/applications/${app.id}`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  };

  // Fee is now per subject, driven by each subject's chosen category.
  const totalFee = selected.reduce((sum, s) => sum + feeForCategory(s.category), 0);
  // Any Medical subject makes the whole application require a medical certificate.
  const derivedType: 'REPEAT' | 'MEDICAL' = selected.some((s) => s.category === 'MEDICAL') ? 'MEDICAL' : 'REPEAT';

  // Subjects already chosen (preserve selection order), and the remaining
  // pool filtered by the search box (matches code or name).
  const selectedSubjects = selected
    .map((s) => subjects.find((subj) => subj.id === s.subjectId))
    .filter((subj): subj is Subject => Boolean(subj));

  // Only subjects with an upcoming exam in an apply-enabled schedule can be
  // applied for. Subjects with no scheduled (future-dated) exam are hidden — if
  // nothing is scheduled/enabled, the pool is empty.
  const schedulableSubjects = subjects.filter((subj) => scheduleForSubject(subj) !== null);

  const query = subjectSearch.trim().toLowerCase();
  const availableSubjects = schedulableSubjects.filter(
    (subj) =>
      !selected.some((s) => s.subjectId === subj.id) &&
      (!query ||
        subj.code.toLowerCase().includes(query) ||
        subj.name.toLowerCase().includes(query)),
  );

  // Detail form shown under each selected subject.
  const renderSubjectForm = (subject: Subject, sel: SelectedSubject) => {
    const errs = showFieldErrors ? subjectFieldErrors(sel) : new Set<keyof SelectedSubject>();
    // Border classes for a plain field: red when flagged, otherwise the default.
    const bc = (field: keyof SelectedSubject) =>
      errs.has(field)
        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
        : 'border-slate-300 focus:border-blue-400 focus:ring-blue-100';
    return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 pb-4 pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Category *</label>
        <select
          value={sel.category}
          onChange={(e) => updateField(subject.id, 'category', e.target.value)}
          className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${bc('category')}`}
        >
          <option value="" disabled>Select category…</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          CA Marks <span className="text-red-500">*</span>
        </label>
        <input
          type="number" min={0} max={100} placeholder="0–100"
          value={sel.caMarks}
          onChange={(e) => updateField(subject.id, 'caMarks', e.target.value)}
          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${bc('caMarks')}`}
        />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
          Upcoming Exam Intake <span className="text-red-500">*</span>
          {sel.upcomingExamIntake && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">Auto-filled</span>
          )}
        </label>
        <input
          type="text" placeholder="From exam schedule"
          value={sel.upcomingExamIntake}
          onChange={(e) => updateField(subject.id, 'upcomingExamIntake', e.target.value)}
          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${
            errs.has('upcomingExamIntake')
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : sel.upcomingExamIntake
                ? 'border-blue-300 bg-blue-50 focus:border-blue-400 focus:ring-blue-100'
                : 'border-slate-300 focus:border-blue-400 focus:ring-blue-100'
          }`}
        />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
          Upcoming Exam Date <span className="text-red-500">*</span>
          {sel.upcomingExamDate && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">Auto-filled</span>
          )}
        </label>
        <input
          type="date"
          min={todayISO}
          value={sel.upcomingExamDate}
          onChange={(e) => updateField(subject.id, 'upcomingExamDate', e.target.value)}
          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${
            errs.has('upcomingExamDate')
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : sel.upcomingExamDate
                ? 'border-blue-300 bg-blue-50 focus:border-blue-400 focus:ring-blue-100'
                : 'border-slate-300 focus:border-blue-400 focus:ring-blue-100'
          }`}
        />
      </div>

      {/* Medical certificate — occupies the space beside the exam date for
          Medical-category subjects. */}
      {sel.category === 'MEDICAL' && (
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            Medical Certificate <span className="text-red-500">*</span>
            <span className="font-normal text-slate-400">(PDF, JPG or PNG · max 10MB)</span>
          </label>
          {sel.medicalCertificate ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
              <span className="flex items-center gap-2 truncate text-sm font-medium text-emerald-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{sel.medicalCertificate.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setCertificate(subject.id, undefined)}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          ) : (
            <label className={`group flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2 transition-colors ${
              errs.has('medicalCertificate')
                ? 'border-red-400 bg-red-50/40 hover:bg-red-50'
                : 'border-blue-300 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50'
            }`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <Paperclip className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-blue-700">Attach certificate</span>
                <span className="block truncate text-xs text-slate-400">Click to upload a file</span>
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => setCertificate(subject.id, e.target.files?.[0])}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}

      <div className="sm:col-span-2 lg:col-span-4">
        <p className="mb-2 border-t border-slate-200 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Previous Examination Details
        </p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Date of Previous Exam <span className="text-red-500">*</span></label>
            <input
              type="date"
              max={todayISO}
              value={sel.previousExamDate}
              onChange={(e) => updateField(subject.id, 'previousExamDate', e.target.value)}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${bc('previousExamDate')}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Intake Details <span className="text-red-500">*</span></label>
            <input
              type="text" placeholder="e.g : 17A WD"
              list="intake-list"
              value={sel.previousExamIntake}
              onChange={(e) => updateField(subject.id, 'previousExamIntake', e.target.value)}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${bc('previousExamIntake')}`}
            />
          </div>
          {sel.category === 'REPEAT' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Grade Earned <span className="text-red-500">*</span></label>
              <input
                type="text" placeholder="e.g. C, D, F"
                value={sel.gradeEarned}
                onChange={(e) => updateField(subject.id, 'gradeEarned', e.target.value)}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${bc('gradeEarned')}`}
              />
            </div>
          )}
        </div>
      </div>

    </div>
    );
  };

  return (
    <StudentShell>
      <Link
        href="/dashboard/student/applications"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Applications
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Application</h1>
        <p className="mt-1 text-sm text-slate-500">
          Application for the End Semester Examination — School of Accounting and Business
        </p>
      </div>

      {/* Step indicator */}
      <div className="mx-auto mb-7 flex max-w-4xl items-center px-1">
        {STEPS.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const current = step === num;
          return (
            <React.Fragment key={label}>
              <div className="flex min-w-0 flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all sm:h-10 sm:w-10 sm:text-sm ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : current
                        ? 'bg-blue-600 text-white ring-2 ring-blue-100 sm:ring-4'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : num}
                </div>
                <span className={`mt-1.5 text-center text-[10px] font-medium sm:mt-2 sm:text-xs ${current ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1.5 mb-5 h-0.5 flex-1 rounded sm:mx-2 sm:mb-6 ${step > num ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="w-full">
        {/* Step 1 — Verify Your Details */}
        {step === 1 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">Verify Your Details</h2>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Please confirm your personal information for this application.
            </p>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Please confirm that your details are correct. If any details are incorrect, please update them accordingly.
              </p>
            </div>

            {/* All fields editable */}
            {loadingProfile ? (
              <div className="mt-5 space-y-3">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {programme && (
                <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Programme: <span className="font-medium text-slate-700">{programme}</span>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Full Name (in block capitals) *</label>
                <input
                  type="text"
                  value={applicant.fullName}
                  onChange={(e) => {
                    const upper = e.target.value.toUpperCase();
                    setApplicant(prev => ({
                      ...prev,
                      fullName: upper,
                      nameWithInitials: generateInitials(upper)
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Name with Initials</label>
                <input
                  type="text"
                  value={applicant.nameWithInitials}
                  onChange={(e) => updateApplicant('nameWithInitials', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Registration Number *</label>
                <input
                  type="text"
                  value={applicant.registrationNumber}
                  onChange={(e) => updateApplicant('registrationNumber', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">NIC / Passport No *</label>
                <input
                  type="text"
                  value={applicant.nic}
                  onChange={(e) => updateApplicant('nic', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Batch</label>
                <input
                  type="text"
                  value={applicant.batchNumber}
                  onChange={(e) => updateApplicant('batchNumber', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Intake</label>
                <input
                  type="text"
                  value={applicant.intake}
                  onChange={(e) => updateApplicant('intake', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Permanent Address *</label>
                <input
                  type="text"
                  value={applicant.permanentAddress}
                  onChange={(e) => updateApplicant('permanentAddress', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Postal Address (if different)</label>
                <input
                  type="text"
                  value={applicant.postalAddress}
                  onChange={(e) => updateApplicant('postalAddress', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Telephone (Home)</label>
                <input
                  type="tel"
                  value={applicant.telephone}
                  onChange={(e) => updateApplicant('telephone', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Mobile *</label>
                <input
                  type="tel"
                  value={applicant.mobile}
                  onChange={(e) => updateApplicant('mobile', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Email *</label>
                <input
                  type="email"
                  value={applicant.email}
                  onChange={(e) => updateApplicant('email', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <button
              onClick={continueFromDetails}
              disabled={savingDetails}
              className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {savingDetails ? 'Saving…' : 'Confirm & Continue'}
            </button>
          </div>
        )}

        {/* Step 2 — Subjects */}
        {step === 2 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {/* Intake/batch suggestions for the "Intake Details" fields. */}
            <datalist id="intake-list">
              {batchList.map((b) => <option key={b} value={b} />)}
            </datalist>
            <h2 className="text-base font-semibold text-slate-900">Subjects Applied For</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Select each subject and fill the details. <span className="font-medium text-slate-700">CA Marks are mandatory.</span>
            </p>

            {loadingSubjects ? (
              <div className="mt-5 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : (
              <>
                {/* Selected subjects — always visible with their detail forms */}
                {selectedSubjects.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Selected Subjects ({selectedSubjects.length})
                    </p>
                    <div className="space-y-3">
                      {selectedSubjects.map((subject) => {
                        const sel = selected.find((s) => s.subjectId === subject.id)!;
                        return (
                          <div key={subject.id} className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm ring-1 ring-blue-100/60">
                            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-blue-50/40 px-4 py-2.5">
                              <p className="text-sm font-semibold text-slate-900">
                                <span className="text-blue-600">{subject.code}</span> — {subject.name}
                                {sel.category && (
                                  <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                                    LKR {feeForCategory(sel.category).toLocaleString()}
                                  </span>
                                )}
                              </p>
                              <button
                                onClick={() => toggleSubject(subject.id)}
                                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Remove subject"
                              >
                                <X className="h-3.5 w-3.5" /> Remove
                              </button>
                            </div>
                            {renderSubjectForm(subject, sel)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search + add available subjects */}
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Add Subjects
                  </p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      placeholder="Search by subject code or name…"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-9 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    {subjectSearch && (
                      <button
                        onClick={() => setSubjectSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2">
                    {availableSubjects.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">
                        {schedulableSubjects.length === 0
                          ? 'No subjects are currently open for application. Applications open once an exam schedule is published and enabled.'
                          : query
                            ? `No subjects match “${subjectSearch}”.`
                            : 'All available subjects have been selected.'}
                      </p>
                    ) : (
                      availableSubjects.map((subject) => (
                        <button
                          key={subject.id}
                          onClick={() => { toggleSubject(subject.id); }}
                          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-blue-50"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-400 transition-colors group-hover:border-blue-500 group-hover:bg-blue-600 group-hover:text-white">
                            <Plus className="h-4 w-4" />
                          </span>
                          <span className="text-sm text-slate-700">
                            <span className="font-semibold text-blue-600">{subject.code}</span> — {subject.name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {availableSubjects.length} subject{availableSubjects.length !== 1 ? 's' : ''} available · click to add
                  </p>
                </div>
              </>
            )}

            {selected.length > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-600">{selected.length} subject(s)</span>
                <span className="font-bold text-blue-700">Total: LKR {totalFee.toLocaleString()}.00</span>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button
                onClick={() => { if (validateStep2()) setStep(3); }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Review ({selected.length} subject{selected.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Review &amp; Confirm</h2>
            <p className="mt-0.5 text-sm text-slate-500">Check the details before creating your application.</p>

            {/* Applicant details summary */}
            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your Details</p>
                <button onClick={() => setStep(1)} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-2"><span className="text-slate-500">Name</span><span className="text-right font-medium text-slate-800">{applicant.fullName || '—'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">Mobile</span><span className="font-medium text-slate-800">{applicant.mobile || '—'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">Email</span><span className="truncate text-right font-medium text-slate-800">{applicant.email || '—'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">Reg. No</span><span className="font-medium text-slate-800">{applicant.registrationNumber || '—'}</span></div>
                <div className="flex justify-between gap-2 sm:col-span-2"><span className="text-slate-500">Permanent Address</span><span className="truncate text-right font-medium text-slate-800">{applicant.permanentAddress || '—'}</span></div>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900">
                  {derivedType === 'REPEAT' ? 'Repeat' : 'Medical'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subjects</span>
                <span className="font-medium text-slate-900">{selected.length}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                <span className="text-slate-500">Examination Fee</span>
                <span className="font-bold text-blue-700">LKR {totalFee.toLocaleString()}.00</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {selected.map((s) => {
                const subj = subjects.find((sub) => sub.id === s.subjectId);
                return (
                  <div key={s.subjectId} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{subj?.code} — {subj?.name}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s.category}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>CA: {s.caMarks}</span>
                      {s.upcomingExamIntake && <span>Intake: {s.upcomingExamIntake}</span>}
                      {s.upcomingExamDate && <span>Exam date: {new Date(s.upcomingExamDate).toLocaleDateString('en-LK', { dateStyle: 'medium' })}</span>}
                      {s.previousExamDate && <span>Prev: {s.previousExamDate}</span>}
                      {s.gradeEarned && <span>Grade: {s.gradeEarned}</span>}
                      {s.medicalCertificate && <span>Certificate: {s.medicalCertificate.name}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="mb-1 font-semibold">I certify that the particulars disclosed above are true and accurate.</p>
              <p>
                By submitting you confirm payment of LKR {totalFee.toLocaleString()}.00 to {BANK_DETAILS.bank},
                {' '}{BANK_DETAILS.branch} (Account {BANK_DETAILS.account}).
              </p>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </StudentShell>
  );
}
