'use client';

import React, { useEffect, useState } from 'react';
import { UserCog, Plus, Pencil, Trash2, Loader2, AlertCircle, Search } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminStudent } from '@/lib/admin-api';
import { deriveIntakeClient } from '@/lib/derive-intake';

const PAGE = 50;

type FormState = {
  registrationNumber: string;
  nic: string;
  title: string;
  fullName: string;
  nameWithInitials: string;
  gender: string;
  email: string;
  mobile: string;
  telephone: string;
  permanentAddress: string;
  postalAddress: string;
  batchNumber: string;
  intake: string;
};

const EMPTY: FormState = {
  registrationNumber: '', nic: '', title: '', fullName: '', nameWithInitials: '',
  gender: '', email: '', mobile: '', telephone: '', permanentAddress: '',
  postalAddress: '', batchNumber: '', intake: '',
};

export default function StudentManagePage() {
  const [items, setItems] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStudent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = (reset = false) => {
    setLoading(true);
    const nextSkip = reset ? 0 : skip;
    adminApi.listStudents({ search: search.trim() || undefined, take: PAGE, skip: nextSkip })
      .then((d) => { setItems(d.items); setTotal(d.total); if (reset) setSkip(0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => load(true), search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [skip]);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => {
    setEditing(null); setForm(EMPTY); setError(''); setModalOpen(true);
  };
  const openEdit = (s: AdminStudent) => {
    setEditing(s);
    setForm({
      registrationNumber: s.registrationNumber, nic: s.nic, title: s.title || '',
      fullName: s.fullName, nameWithInitials: s.nameWithInitials || '', gender: s.gender || '',
      email: s.email || '', mobile: s.mobile || '', telephone: s.telephone || '',
      permanentAddress: s.permanentAddress || '', postalAddress: s.postalAddress || '',
      batchNumber: s.batchNumber, intake: s.intake,
    });
    setError(''); setModalOpen(true);
  };

  // On create, auto-fill intake/batch from the registration number (editable).
  const onRegChange = (v: string) => {
    setForm((p) => {
      const next = { ...p, registrationNumber: v };
      if (!editing) {
        const derived = deriveIntakeClient(v);
        next.intake = derived;
        next.batchNumber = derived;
      }
      return next;
    });
  };

  const save = async () => {
    setError('');
    if (!form.registrationNumber.trim() || !form.nic.trim() || !form.fullName.trim()) {
      setError('Registration number, NIC and full name are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateStudent(editing.id, {
          nic: form.nic, title: form.title, fullName: form.fullName,
          nameWithInitials: form.nameWithInitials, gender: form.gender, email: form.email,
          mobile: form.mobile, telephone: form.telephone, permanentAddress: form.permanentAddress,
          postalAddress: form.postalAddress, batchNumber: form.batchNumber, intake: form.intake,
        });
      } else {
        await adminApi.createStudent({
          registrationNumber: form.registrationNumber, nic: form.nic, fullName: form.fullName,
          title: form.title, nameWithInitials: form.nameWithInitials, gender: form.gender,
          email: form.email, mobile: form.mobile, telephone: form.telephone,
          permanentAddress: form.permanentAddress, postalAddress: form.postalAddress,
          batchNumber: form.batchNumber, intake: form.intake,
        });
      }
      setModalOpen(false);
      load(true);
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Save failed');
    } finally { setSaving(false); }
  };

  const remove = async (s: AdminStudent) => {
    if (!confirm(`Delete ${s.fullName} (${s.registrationNumber})?`)) return;
    await adminApi.deleteStudent(s.id);
    load();
  };

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <UserCog className="h-6 w-6 text-amber-500" /> Student Manage
          </h1>
          <p className="mt-1 text-sm text-slate-500">Create, edit and remove student records.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600">
          <Plus className="h-4 w-4" /> New Student
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{total.toLocaleString()} student(s)</span>
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, reg no, NIC, intake…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No students found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Registration No</th>
                  <th className="px-4 py-3 font-medium">NIC</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Full Name</th>
                  <th className="px-4 py-3 font-medium">Name w/ Initials</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Telephone</th>
                  <th className="px-4 py-3 font-medium">Permanent Address</th>
                  <th className="px-4 py-3 font-medium">Postal Address</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Intake</th>
                  <th className="sticky right-0 bg-white px-4 py-3 font-medium text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.registrationNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{s.nic || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.title || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.nameWithInitials || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.gender || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.mobile || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.telephone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.permanentAddress || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.postalAddress || '—'}</td>
                    <td className="px-4 py-3"><span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{s.batchNumber}</span></td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s.intake}</span></td>
                    <td className="sticky right-0 bg-white px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600" title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(s)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">{skip + 1}–{Math.min(skip + PAGE, total)} of {total.toLocaleString()}</span>
            <div className="flex gap-2">
              <button onClick={() => setSkip(Math.max(0, skip - PAGE))} disabled={skip === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setSkip(skip + PAGE)} disabled={skip + PAGE >= total} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Student' : 'New Student'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Save Changes' : 'Create Student'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Registration Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.registrationNumber}
              onChange={(e) => onRegChange(e.target.value)}
              disabled={!!editing}
              placeholder="BSc/2026/HONS-21A/MOHE/WD-001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50"
            />
            {editing && <p className="mt-1 text-[11px] text-slate-400">Registration number cannot be changed.</p>}
            {!editing && <p className="mt-1 text-[11px] text-slate-400">Intake &amp; batch auto-fill from this — editable below.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="NIC / Passport" value={form.nic} onChange={(v) => set('nic', v)} required />
            <Field label="Title" value={form.title} onChange={(v) => set('title', v)} placeholder="Mr. / Ms." />
          </div>
          <Field label="Full Name" value={form.fullName} onChange={(v) => set('fullName', v)} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name with Initials" value={form.nameWithInitials} onChange={(v) => set('nameWithInitials', v)} />
            <Field label="Gender" value={form.gender} onChange={(v) => set('gender', v)} placeholder="Male / Female" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" value={form.email} onChange={(v) => set('email', v)} type="email" />
            <Field label="Mobile" value={form.mobile} onChange={(v) => set('mobile', v)} />
          </div>
          <Field label="Telephone" value={form.telephone} onChange={(v) => set('telephone', v)} />
          <Field label="Permanent Address" value={form.permanentAddress} onChange={(v) => set('permanentAddress', v)} />
          <Field label="Postal Address" value={form.postalAddress} onChange={(v) => set('postalAddress', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch Number" value={form.batchNumber} onChange={(v) => set('batchNumber', v)} />
            <Field label="Intake" value={form.intake} onChange={(v) => set('intake', v)} />
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
