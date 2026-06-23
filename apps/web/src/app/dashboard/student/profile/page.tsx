'use client';

import React, { useEffect, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Hash,
  GraduationCap,
  Building2,
  Contact,
  Smartphone,
} from 'lucide-react';
import { StudentShell } from '@/components/student/StudentShell';
import { studentsApi } from '@/lib/applications-api';

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentsApi.getProfile().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const initials = (profile?.fullName || 'S')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const fields = [
    { label: 'Full Name', value: profile?.fullName, icon: User },
    { label: 'Name with Initials', value: profile?.nameWithInitials, icon: User },
    { label: 'Registration Number', value: profile?.registrationNumber, icon: Hash, mono: true },
    { label: 'NIC Number', value: profile?.nic, icon: Contact, mono: true },
    { label: 'Batch', value: profile?.batchNumber, icon: GraduationCap },
    { label: 'Intake', value: profile?.intake, icon: Building2 },
    { label: 'Email', value: profile?.email, icon: Mail },
    { label: 'Mobile', value: profile?.mobile, icon: Smartphone },
    { label: 'Telephone', value: profile?.telephone, icon: Phone },
    { label: 'Permanent Address', value: profile?.permanentAddress, icon: MapPin, full: true },
    { label: 'Postal Address', value: profile?.postalAddress, icon: MapPin, full: true },
  ];

  return (
    <StudentShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your registered student details.</p>
      </div>

      {/* Header card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-slate-800 text-2xl font-bold text-white shadow-md">
                {loading ? '·' : initials}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-slate-900">
                  {loading ? 'Loading…' : profile?.fullName}
                </h2>
                <p className="text-sm text-slate-500">
                  {profile?.batch?.programme?.name || profile?.registrationNumber}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Active Student
            </span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Personal Information
        </h3>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-2.5 w-1/3 rounded bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {fields.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className={f.full ? 'sm:col-span-2' : ''}>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Icon className="h-3.5 w-3.5" />
                    {f.label}
                  </div>
                  <p className={`text-sm text-slate-900 ${f.mono ? 'font-mono' : 'font-medium'}`}>
                    {f.value || <span className="text-slate-300">—</span>}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
