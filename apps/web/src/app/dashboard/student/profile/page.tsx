'use client';

import React, { useEffect, useState } from 'react';
import {
  User, Mail, Phone, MapPin, Hash, GraduationCap, Building2, Contact,
  Smartphone, Layers, CheckCircle2, UserCircle, BookOpen,
} from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { studentsApi } from '@/lib/applications-api';

type TintKey = 'indigo' | 'violet' | 'emerald' | 'amber';
const TINTS: Record<TintKey, { chip: string; head: string }> = {
  indigo:  { chip: 'bg-indigo-50 text-indigo-600',   head: 'text-indigo-600' },
  violet:  { chip: 'bg-violet-50 text-violet-600',   head: 'text-violet-600' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', head: 'text-emerald-600' },
  amber:   { chip: 'bg-amber-50 text-amber-600',     head: 'text-amber-600' },
};

interface Field { label: string; value?: string; icon: React.ComponentType<{ className?: string }>; mono?: boolean; full?: boolean; }

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentsApi.getProfile().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const initials = (profile?.fullName || 'S')
    .split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const programme = profile?.batch?.programme?.name;

  const sections: { title: string; icon: React.ComponentType<{ className?: string }>; tint: TintKey; fields: Field[] }[] = [
    {
      title: 'Identity', icon: UserCircle, tint: 'indigo', fields: [
        { label: 'Full Name', value: profile?.fullName, icon: User },
        { label: 'Name with Initials', value: profile?.nameWithInitials, icon: User },
        { label: 'Registration Number', value: profile?.registrationNumber, icon: Hash, mono: true },
        { label: 'NIC Number', value: profile?.nic, icon: Contact, mono: true },
      ],
    },
    {
      title: 'Academic', icon: BookOpen, tint: 'violet', fields: [
        { label: 'Programme', value: programme, icon: GraduationCap },
        { label: 'Batch', value: profile?.batchNumber, icon: Layers },
        { label: 'Intake', value: profile?.intake, icon: Building2 },
      ],
    },
    {
      title: 'Contact', icon: Mail, tint: 'emerald', fields: [
        { label: 'Email', value: profile?.email, icon: Mail },
        { label: 'Mobile', value: profile?.mobile, icon: Smartphone },
        { label: 'Telephone', value: profile?.telephone, icon: Phone },
      ],
    },
    {
      title: 'Address', icon: MapPin, tint: 'amber', fields: [
        { label: 'Permanent Address', value: profile?.permanentAddress, icon: MapPin, full: true },
        { label: 'Postal Address', value: profile?.postalAddress, icon: MapPin, full: true },
      ],
    },
  ];

  return (
    <StudentShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your registered student details.</p>
      </div>

      {/* Header card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-slate-700 to-slate-900 text-2xl font-bold text-white shadow-md">
                {loading ? '·' : initials}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {loading ? 'Loading…' : profile?.fullName}
                </h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
                  {programme && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {programme}</span>}
                  {profile?.registrationNumber && <span className="font-mono text-xs text-slate-400">· {profile.registrationNumber}</span>}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active Student
            </span>
          </div>
        </div>
      </div>

      {/* Sections */}
      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 h-4 w-1/4 animate-pulse rounded bg-slate-100" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-100" />
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {sections.map((sec) => {
            const SecIcon = sec.icon;
            const t = TINTS[sec.tint];
            return (
              <div key={sec.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.chip}`}>
                    <SecIcon className="h-4 w-4" />
                  </span>
                  <h3 className={`text-xs font-bold uppercase tracking-wide ${t.head}`}>{sec.title}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {sec.fields.map((f) => {
                    const Icon = f.icon;
                    return (
                      <div key={f.label} className="flex items-start gap-3 py-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{f.label}</p>
                          <p className={`mt-0.5 break-words text-sm text-slate-900 ${f.mono ? 'font-mono' : 'font-medium'}`}>
                            {f.value || <span className="text-slate-300">—</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-center text-xs text-slate-400">
        To correct your address, mobile or email, update them on a new application — the rest of your record is managed by the institute.
      </p>
    </StudentShell>
  );
}
