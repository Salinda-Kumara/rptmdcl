'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  Check,
  UserCheck,
  Info,
  Search,
  Plus,
  X,
} from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { applicationsApi, studentsApi, Subject, ApplicantDetails, ScheduledExamInfo } from '@/lib/applications-api';

type AppType = 'REPEAT' | 'MEDICAL';
type Category = 'REPEAT' | 'MEDICAL' | '1ST_ATTEMPT';

interface SelectedSubject {
  subjectId: string;
  category: Category;
  caMarks: string;
  upcomingExamIntake: string;
  upcomingExamDate: string;
  previousExamDate: string;
  previousExamIntake: string;
  gradeEarned: string;
}

// Bank payment details from the physical form
const BANK_DETAILS = {
  name: 'The Institute of Chartered Accountants of Sri Lanka - SAB',
  bank: 'Sampath Bank',
  branch: 'Borella',
  account: '000460002370',
};

const FEES = { REPEAT: 2600, MEDICAL: 5200 };
const STEPS = ['Your Details', 'Type', 'Subjects', 'Review'];

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

// Valid subject categories per application type.
// A Repeat application cannot contain a "Medical" subject, and vice versa.
const CATEGORY_OPTIONS: Record<AppType, { value: Category; label: string }[]> = {
  REPEAT: [
    { value: 'REPEAT', label: 'Repeat' },
  ],
  MEDICAL: [
    { value: 'MEDICAL', label: 'Medical' },
    { value: '1ST_ATTEMPT', label: '1st Attempt' },
  ],
};

const defaultCategoryFor = (type: AppType): Category => (type === 'MEDICAL' ? 'MEDICAL' : 'REPEAT');

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

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [appType, setAppType] = useState<AppType>('REPEAT');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<SelectedSubject[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [scheduledExams, setScheduledExams] = useState<ScheduledExamInfo[]>([]);
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

  const emptySubject = (subjectId: string): SelectedSubject => ({
    subjectId,
    category: defaultCategoryFor(appType),
    caMarks: '',
    upcomingExamIntake: '',
    upcomingExamDate: '',
    previousExamDate: '',
    previousExamIntake: '',
    gradeEarned: '',
  });

  // Match a subject to a published timetable row by course code (spaces/case are
  // ignored). When several rows share a code, prefer the one for the student's own
  // intake; otherwise take the earliest.
  const normCode = (c?: string | null) => (c ?? '').toUpperCase().replace(/\s+/g, '');
  const scheduleForSubject = (subject: Subject): ScheduledExamInfo | null => {
    const code = normCode(subject.code);
    const matches = scheduledExams.filter((e) => normCode(e.courseCode) === code);
    if (!matches.length) return null;
    const myIntake = (applicant.intake || applicant.batchNumber || '').toLowerCase().trim();
    if (myIntake) {
      const token = myIntake.split(/[\/\s]/)[0]; // e.g. "3B" from "3B WE/MOHE WE"
      const pref = matches.find((e) => (e.intake ?? '').toLowerCase().includes(token) && token.length > 1);
      if (pref) return pref;
    }
    return matches[0];
  };

  // Prefer the revised date, else the original exam date, as a yyyy-mm-dd string.
  const scheduleDate = (e: ScheduledExamInfo): string => {
    const d = e.revisedDate ?? e.examDate;
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  };

  // Changing the application type re-normalizes any already-selected subject
  // categories so they remain valid for the new type.
  const selectType = (type: AppType) => {
    setAppType(type);
    const allowed = CATEGORY_OPTIONS[type].map((o) => o.value);
    setSelected((prev) =>
      prev.map((s) => ({
        ...s,
        category: allowed.includes(s.category) ? s.category : defaultCategoryFor(type),
        // Grade earned only applies to repeat subjects
        gradeEarned: type === 'REPEAT' ? s.gradeEarned : '',
      })),
    );
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

  const validateStep2 = () => {
    if (selected.length === 0) { setError('Select at least one subject'); return false; }
    for (const s of selected) {
      const code = subjects.find((subj) => subj.id === s.subjectId)?.code ?? 'subject';
      if (s.caMarks === '' || s.caMarks === undefined) { setError(`CA Marks are required (${code})`); return false; }
      if (!s.upcomingExamIntake.trim()) { setError(`Upcoming Exam Intake is required (${code})`); return false; }
      if (!s.upcomingExamDate) { setError(`Upcoming Exam Date is required (${code})`); return false; }
      if (!s.previousExamDate) { setError(`Date of Previous Exam is required (${code})`); return false; }
      if (!s.previousExamIntake.trim()) { setError(`Previous exam Intake Details are required (${code})`); return false; }
      if (appType === 'REPEAT' && !s.gradeEarned.trim()) { setError(`Grade Earned is required (${code})`); return false; }
    }
    setError('');
    return true;
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError('');
    try {
      const app = await applicationsApi.create({
        type: appType,
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
      router.push(`/dashboard/student/applications/${app.id}`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  };

  const feePerSubject = FEES[appType];
  const totalFee = selected.length * feePerSubject;

  // Subjects already chosen (preserve selection order), and the remaining
  // pool filtered by the search box (matches code or name).
  const selectedSubjects = selected
    .map((s) => subjects.find((subj) => subj.id === s.subjectId))
    .filter((subj): subj is Subject => Boolean(subj));

  const query = subjectSearch.trim().toLowerCase();
  const availableSubjects = subjects.filter(
    (subj) =>
      !selected.some((s) => s.subjectId === subj.id) &&
      (!query ||
        subj.code.toLowerCase().includes(query) ||
        subj.name.toLowerCase().includes(query)),
  );

  // Detail form shown under each selected subject.
  const renderSubjectForm = (subject: Subject, sel: SelectedSubject) => (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Category *</label>
        <select
          value={sel.category}
          onChange={(e) => updateField(subject.id, 'category', e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {CATEGORY_OPTIONS[appType].map((opt) => (
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
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
            sel.upcomingExamIntake
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
          value={sel.upcomingExamDate}
          onChange={(e) => updateField(subject.id, 'upcomingExamDate', e.target.value)}
          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${
            sel.upcomingExamDate
              ? 'border-blue-300 bg-blue-50 focus:border-blue-400 focus:ring-blue-100'
              : 'border-slate-300 focus:border-blue-400 focus:ring-blue-100'
          }`}
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <p className="mb-2 border-t border-slate-200 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Previous Examination Details
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Date of Previous Exam <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={sel.previousExamDate}
              onChange={(e) => updateField(subject.id, 'previousExamDate', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Intake Details <span className="text-red-500">*</span></label>
            <input
              type="text" placeholder="e.g : 17A WD"
              value={sel.previousExamIntake}
              onChange={(e) => updateField(subject.id, 'previousExamIntake', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {appType === 'REPEAT' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Grade Earned <span className="text-red-500">*</span></label>
              <input
                type="text" placeholder="e.g. C, D, F"
                value={sel.gradeEarned}
                onChange={(e) => updateField(subject.id, 'gradeEarned', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
              onClick={() => { if (validateDetails()) setStep(2); }}
              className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Confirm &amp; Continue
            </button>
          </div>
        )}

        {/* Step 2 — Application Type */}
        {step === 2 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Select Application Type</h2>
            <p className="mt-0.5 text-sm text-slate-500">Choose the type of examination application.</p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([
                { type: 'REPEAT' as AppType, title: 'Repeat', desc: 'Repeat a failed subject', fee: 2600, icon: RefreshCw, tint: 'blue' },
                { type: 'MEDICAL' as AppType, title: 'Medical', desc: 'Re-sit on medical grounds', fee: 5200, icon: HeartPulse, tint: 'rose' },
              ]).map(({ type, title, desc, fee, icon: Icon, tint }) => {
                const active = appType === type;
                return (
                  <button
                    key={type}
                    onClick={() => selectType(type)}
                    className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                      active
                        ? tint === 'rose'
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {active && (
                      <CheckCircle2 className={`absolute right-3 top-3 h-5 w-5 ${tint === 'rose' ? 'text-rose-500' : 'text-blue-600'}`} />
                    )}
                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
                        tint === 'rose' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
                    <p className={`mt-2 text-sm font-bold ${tint === 'rose' ? 'text-rose-600' : 'text-blue-600'}`}>
                      LKR {fee.toLocaleString()} / subject
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Continue to Subjects
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Subjects */}
        {step === 3 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Subjects Applied For</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Select each subject and fill the details. <span className="font-medium text-slate-700">CA Marks are mandatory.</span>
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

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
                          <div key={subject.id} className="rounded-xl border border-blue-300 bg-blue-50/50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">
                                <span className="text-blue-600">{subject.code}</span> — {subject.name}
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
                        {subjects.length === 0
                          ? 'No subjects available for your programme.'
                          : query
                            ? `No subjects match “${subjectSearch}”.`
                            : 'All subjects have been selected.'}
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
                <span className="text-slate-600">{selected.length} subject(s) × LKR {feePerSubject.toLocaleString()}</span>
                <span className="font-bold text-blue-700">Total: LKR {totalFee.toLocaleString()}.00</span>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button
                onClick={() => { if (validateStep2()) setStep(4); }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Review ({selected.length} subject{selected.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
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
                  {appType === 'REPEAT' ? 'Repeat' : 'Medical'}
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
              <button onClick={() => setStep(3)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
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
