'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  HeartPulse,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Check,
  UserCheck,
  Info,
} from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { applicationsApi, studentsApi, Subject, ApplicantDetails } from '@/lib/applications-api';

type AppType = 'REPEAT' | 'MEDICAL';
type Category = 'REPEAT' | 'MEDICAL' | '1ST_ATTEMPT';

interface SelectedSubject {
  subjectId: string;
  category: Category;
  caMarks: string;
  upcomingExamIntake: string;
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
    { value: '1ST_ATTEMPT', label: '1st Attempt' },
  ],
  MEDICAL: [
    { value: 'MEDICAL', label: 'Medical' },
    { value: '1ST_ATTEMPT', label: '1st Attempt' },
  ],
};

const defaultCategoryFor = (type: AppType): Category => (type === 'MEDICAL' ? 'MEDICAL' : 'REPEAT');

export default function NewApplicationPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [appType, setAppType] = useState<AppType>('REPEAT');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<SelectedSubject[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

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

    studentsApi.getProfile()
      .then((p: any) => {
        setApplicant({
          fullName: p.fullName ?? '',
          nameWithInitials: p.nameWithInitials ?? '',
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
    previousExamDate: '',
    previousExamIntake: '',
    gradeEarned: '',
  });

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
      return exists ? prev.filter((s) => s.subjectId !== subjectId) : [...prev, emptySubject(subjectId)];
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
      if (s.caMarks === '' || s.caMarks === undefined) {
        setError('CA Marks are mandatory for all selected subjects');
        return false;
      }
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
      <div className="mx-auto mb-7 flex max-w-2xl items-center">
        {STEPS.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const current = step === num;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : current
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <Check className="h-5 w-5" /> : num}
                </div>
                <span className={`mt-2 text-xs font-medium ${current ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 mb-6 h-0.5 flex-1 rounded ${step > num ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mx-auto max-w-3xl">
        {/* Step 1 — Verify Your Details */}
        {step === 1 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">Verify Your Details</h2>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Please confirm your personal information for this application.
            </p>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                You may correct any details below — these changes apply only to this application and
                will <span className="font-semibold">not</span> change your registered student record.
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
                  onChange={(e) => updateApplicant('fullName', e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Select Application Type</h2>
            <p className="mt-0.5 text-sm text-slate-500">Choose the type of examination application.</p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([
                { type: 'REPEAT' as AppType, title: 'Repeat / Re-Repeat', desc: 'Repeat a failed subject', fee: 2600, icon: RefreshCw, tint: 'blue' },
                { type: 'MEDICAL' as AppType, title: 'Medical Grounds', desc: 'Re-sit on medical grounds', fee: 5200, icon: HeartPulse, tint: 'rose' },
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

            {/* Bank details */}
            <div className="mt-6 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-900">Payment Instructions</p>
              </div>
              <p className="mb-3 text-xs text-amber-700">
                Pay the examination fee to the account below before submitting. Keep the deposit slip / transaction reference.
              </p>
              <dl className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                <div className="flex justify-between gap-2 sm:col-span-2">
                  <dt className="text-amber-600">Account Name</dt>
                  <dd className="text-right font-medium text-amber-900">{BANK_DETAILS.name}</dd>
                </div>
                <div className="flex justify-between"><dt className="text-amber-600">Bank</dt><dd className="font-medium text-amber-900">{BANK_DETAILS.bank}</dd></div>
                <div className="flex justify-between"><dt className="text-amber-600">Branch</dt><dd className="font-medium text-amber-900">{BANK_DETAILS.branch}</dd></div>
                <div className="flex justify-between sm:col-span-2"><dt className="text-amber-600">Account No</dt><dd className="font-mono font-bold text-amber-900">{BANK_DETAILS.account}</dd></div>
              </dl>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
              <div className="mt-5 space-y-3">
                {subjects.map((subject) => {
                  const sel = selected.find((s) => s.subjectId === subject.id);
                  return (
                    <div
                      key={subject.id}
                      className={`rounded-xl border p-4 transition-colors ${sel ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200'}`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={!!sel}
                          onChange={() => toggleSubject(subject.id)}
                          className="mt-0.5 h-4 w-4 cursor-pointer rounded text-blue-600"
                        />
                        <p className="text-sm font-semibold text-slate-900">
                          <span className="text-blue-600">{subject.code}</span> — {subject.name}
                        </p>
                      </label>

                      {sel && (
                        <div className="ml-7 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                            <label className="mb-1 block text-xs font-medium text-slate-600">Upcoming Exam Intake</label>
                            <input
                              type="text" placeholder="e.g. 2024-06"
                              value={sel.upcomingExamIntake}
                              onChange={(e) => updateField(subject.id, 'upcomingExamIntake', e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          </div>

                          <div className="sm:col-span-2 lg:col-span-3">
                            <p className="mb-2 border-t border-slate-200 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Previous Examination Details
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Date of Previous Exam</label>
                                <input
                                  type="date"
                                  value={sel.previousExamDate}
                                  onChange={(e) => updateField(subject.id, 'previousExamDate', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Intake Details</label>
                                <input
                                  type="text" placeholder="e.g. 2022-01"
                                  value={sel.previousExamIntake}
                                  onChange={(e) => updateField(subject.id, 'previousExamIntake', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                              </div>
                              {appType === 'REPEAT' && (
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">Grade Earned</label>
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
                      )}
                    </div>
                  );
                })}
              </div>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  {appType === 'REPEAT' ? 'Repeat / Re-Repeat Examination' : 'Re-sit on Medical Grounds'}
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
                      {s.upcomingExamIntake && <span>Next exam: {s.upcomingExamIntake}</span>}
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
