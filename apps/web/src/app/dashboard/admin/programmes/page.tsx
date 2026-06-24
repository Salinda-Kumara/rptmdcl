'use client';

import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, Loader2, AlertCircle, BookOpen, Layers } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminProgramme } from '@/lib/admin-api';

export default function AdminProgrammesPage() {
  const [items, setItems] = useState<AdminProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProgramme | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.listProgrammes().then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setEditing(null); setCode(''); setName(''); setDescription(''); setError(''); setModalOpen(true);
  };
  const openEdit = (p: AdminProgramme) => {
    setEditing(p); setCode(p.code); setName(p.name); setDescription(p.description || ''); setError(''); setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!code.trim() || !name.trim()) { setError('Code and name are required'); return; }
    setSaving(true);
    try {
      if (editing) await adminApi.updateProgramme(editing.id, { name, description });
      else await adminApi.createProgramme({ code, name, description });
      setModalOpen(false); load();
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Save failed');
    } finally { setSaving(false); }
  };

  const remove = async (p: AdminProgramme) => {
    if (!confirm(`Delete programme "${p.name}"? Subjects and batches under it remain but the programme is hidden.`)) return;
    await adminApi.deleteProgramme(p.id);
    load();
  };

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <GraduationCap className="h-6 w-6 text-amber-500" /> Programmes
          </h1>
          <p className="mt-1 text-sm text-slate-500">Degree programmes offered.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600">
          <Plus className="h-4 w-4" /> New Programme
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No programmes yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">{p.code}</span>
                  <h3 className="mt-2 font-semibold text-slate-900">{p.name}</h3>
                  {p.description && <p className="mt-0.5 text-xs text-slate-400">{p.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(p)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {p._count?.subjects ?? 0} subjects</span>
                <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {p._count?.batches ?? 0} batches</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Programme' : 'New Programme'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Save' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
          <Field label="Code" value={code} onChange={(v) => setCode(v.toUpperCase())} required placeholder="AA" />
          {editing && <p className="-mt-2 text-[11px] text-slate-400">Code cannot be changed.</p>}
          <Field label="Name" value={name} onChange={setName} required placeholder="BSc Applied Accounting" />
          <Field label="Description" value={description} onChange={setDescription} placeholder="Optional" />
        </div>
      </Modal>
    </AdminShell>
  );
}
