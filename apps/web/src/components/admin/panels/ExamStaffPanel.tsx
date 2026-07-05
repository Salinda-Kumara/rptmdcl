'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminExamStaff, ExamStaffRole } from '@/lib/admin-api';

const ROLES: { value: ExamStaffRole; label: string; tint: string }[] = [
  { value: 'EXAMINER',    label: 'Chief Examiners', tint: 'text-indigo-600 bg-indigo-50' },
  { value: 'SUPERVISOR',  label: 'Supervisors',     tint: 'text-amber-600 bg-amber-50' },
  { value: 'INVIGILATOR', label: 'Invigilators',    tint: 'text-emerald-600 bg-emerald-50' },
  { value: 'SUPPORTING',  label: 'Supporting Staff', tint: 'text-sky-600 bg-sky-50' },
  { value: 'OTHER',       label: 'Other',           tint: 'text-slate-600 bg-slate-100' },
];
const roleLabel = (r: ExamStaffRole) => ROLES.find((x) => x.value === r)?.label ?? r;

export function ExamStaffPanel() {
  const [items, setItems] = useState<AdminExamStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminExamStaff | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<ExamStaffRole>('INVIGILATOR');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.listExamStaff().then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setName(''); setRole('INVIGILATOR'); setPhone(''); setEmail(''); setNote(''); setError(''); setModalOpen(true); };
  const openEdit = (s: AdminExamStaff) => { setEditing(s); setName(s.name); setRole(s.role); setPhone(s.phone || ''); setEmail(s.email || ''); setNote(s.note || ''); setError(''); setModalOpen(true); };

  const save = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), role, phone: phone.trim() || undefined, email: email.trim() || undefined, note: note.trim() || undefined };
      if (editing) await adminApi.updateExamStaff(editing.id, payload);
      else await adminApi.createExamStaff(payload);
      setModalOpen(false); load();
    } catch (e: any) { setError(e.response?.data?.message?.toString() || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (s: AdminExamStaff) => {
    if (!confirm(`Remove "${s.name}" from the staff directory?`)) return;
    await adminApi.deleteExamStaff(s.id); load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Users className="h-6 w-6 text-amber-500" /> Exam Staff</h1>
          <p className="mt-1 text-sm text-slate-500">People available for exam duties, grouped by category. Pick them when scheduling exams.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
          <Plus className="h-4 w-4" /> Add Person
        </button>
      </div>

      {loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-white" />)}</div>
      : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No staff added yet.</div>
      : (
        <div className="space-y-6">
          {ROLES.map((r) => {
            const group = items.filter((s) => s.role === r.value);
            if (group.length === 0) return null;
            return (
              <div key={r.value}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.tint}`}>{r.label}</span>
                  <span className="text-xs text-slate-400">{group.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {s.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                        {(s.phone || s.email) && <p className="truncate text-xs text-slate-400">{[s.phone, s.email].filter(Boolean).join(' · ')}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(s)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${roleLabel(role)}` : 'Add Person'}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Add'}
          </button>
        </>}
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
          <Field label="Name" value={name} onChange={setName} required placeholder="Full name" />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Category <span className="text-red-500">*</span></label>
            <select value={role} onChange={(e) => setRole(e.target.value as ExamStaffRole)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="Optional" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="Optional" />
          </div>
          <Field label="Note" value={note} onChange={setNote} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
