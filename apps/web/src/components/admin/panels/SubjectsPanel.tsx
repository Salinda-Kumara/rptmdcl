'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Loader2, AlertCircle, Search } from 'lucide-react';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminSubject, AdminProgramme } from '@/lib/admin-api';

export function SubjectsPanel() {
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [programmes, setProgrammes] = useState<AdminProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSubject | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Core');
  const [programmeId, setProgrammeId] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listSubjects(), adminApi.listProgrammes()])
      .then(([s, p]) => { setSubjects(s); setProgrammes(p); }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setCode(''); setName(''); setCategory('Core'); setProgrammeId(programmeFilter || programmes[0]?.id || ''); setError(''); setModalOpen(true); };
  const openEdit = (s: AdminSubject) => { setEditing(s); setCode(s.code); setName(s.name); setCategory(s.category); setProgrammeId(s.programmeId); setError(''); setModalOpen(true); };

  const save = async () => {
    setError('');
    if (!code.trim() || !name.trim() || !category.trim()) { setError('Code, name and category are required'); return; }
    if (!editing && !programmeId) { setError('Select a programme'); return; }
    setSaving(true);
    try {
      if (editing) await adminApi.updateSubject(editing.id, { code, name, category });
      else await adminApi.createSubject({ code, name, category, programmeId });
      setModalOpen(false); load();
    } catch (e: any) { setError(e.response?.data?.message?.toString() || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (s: AdminSubject) => {
    if (!confirm(`Delete subject "${s.code} — ${s.name}"?`)) return;
    await adminApi.deleteSubject(s.id); load();
  };

  const q = search.trim().toLowerCase();
  const filtered = subjects.filter((s) => (!programmeFilter || s.programmeId === programmeFilter) && (!q || s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><BookOpen className="h-6 w-6 text-amber-500" /> Subjects</h1>
          <p className="mt-1 text-sm text-slate-500">Manage subjects per programme.</p>
        </div>
        <button onClick={openCreate} disabled={programmes.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50">
          <Plus className="h-4 w-4" /> New Subject
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select value={programmeFilter} onChange={(e) => setProgrammeFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none">
          <option value="">All programmes</option>
          {programmes.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code or name…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100" />
        </div>
      </div>

      {loading ? <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white" />)}</div>
      : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">{subjects.length === 0 ? 'No subjects yet.' : 'No subjects match the filters.'}</div>
      : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-6 py-3 font-medium">Code</th><th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Programme</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-semibold text-amber-600">{s.code}</td>
                  <td className="px-4 py-3 text-slate-800">{s.name}</td>
                  <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s.category}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.programme?.code}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(s)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(s)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-6 py-2 text-xs text-slate-400">{filtered.length} subject(s)</p>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subject' : 'New Subject'}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Create'}
          </button>
        </>}
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code" value={code} onChange={(v) => setCode(v.toUpperCase())} required placeholder="ACC101" />
            <Field label="Category" value={category} onChange={setCategory} required placeholder="Core" />
          </div>
          <Field label="Name" value={name} onChange={setName} required placeholder="Accounting Principles" />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Programme <span className="text-red-500">*</span></label>
            <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)} disabled={!!editing}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50">
              <option value="">— Select —</option>
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
            {editing && <p className="mt-1 text-[11px] text-slate-400">Programme cannot be changed.</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
