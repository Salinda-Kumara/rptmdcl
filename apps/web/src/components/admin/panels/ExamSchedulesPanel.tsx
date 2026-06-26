'use client';

import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminSchedule, AdminProgramme } from '@/lib/admin-api';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' });
const toInput = (d: string) => new Date(d).toISOString().slice(0, 10);

export function ExamSchedulesPanel() {
  const [items, setItems] = useState<AdminSchedule[]>([]);
  const [programmes, setProgrammes] = useState<AdminProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [description, setDescription] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listSchedules(), adminApi.listProgrammes()])
      .then(([s, p]) => { setItems(s); setProgrammes(p); }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const progName = (id: string) => { const p = programmes.find((x) => x.id === id); return p ? `${p.code} — ${p.name}` : '—'; };

  const openCreate = () => { setEditing(null); setName(''); setStartDate(''); setEndDate(''); setProgrammeId(programmes[0]?.id || ''); setDescription(''); setError(''); setModalOpen(true); };
  const openEdit = (s: AdminSchedule) => { setEditing(s); setName(s.name); setStartDate(toInput(s.startDate)); setEndDate(toInput(s.endDate)); setProgrammeId(s.programmeId); setDescription(s.description || ''); setError(''); setModalOpen(true); };

  const save = async () => {
    setError('');
    if (!name.trim() || !startDate || !endDate || !programmeId) { setError('Name, dates and programme are required'); return; }
    if (new Date(endDate) < new Date(startDate)) { setError('End date cannot be before start date'); return; }
    setSaving(true);
    try {
      const payload = { name, startDate, endDate, programmeId, description };
      if (editing) await adminApi.updateSchedule(editing.id, payload);
      else await adminApi.createSchedule(payload);
      setModalOpen(false); load();
    } catch (e: any) { setError(e.response?.data?.message?.toString() || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (s: AdminSchedule) => {
    if (!confirm(`Delete schedule "${s.name}"?`)) return;
    await adminApi.deleteSchedule(s.id); load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><CalendarDays className="h-6 w-6 text-amber-500" /> Exam Schedules</h1>
          <p className="mt-1 text-sm text-slate-500">Define examination periods — upcoming exam dates auto-fill from these.</p>
        </div>
        <button onClick={openCreate} disabled={programmes.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50">
          <Plus className="h-4 w-4" /> New Schedule
        </button>
      </div>

      {loading ? <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-white" />)}</div>
      : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No exam schedules yet.</div>
      : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{s.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{fmt(s.startDate)} → {fmt(s.endDate)} · {progName(s.programmeId)}</p>
                {s.description && <p className="mt-0.5 text-xs text-slate-400">{s.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(s)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Schedule' : 'New Schedule'}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Create'}
          </button>
        </>}
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
          <Field label="Name" value={name} onChange={setName} required placeholder="June 2024 End Semester Exam" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" value={startDate} onChange={setStartDate} type="date" required />
            <Field label="End Date" value={endDate} onChange={setEndDate} type="date" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Programme <span className="text-red-500">*</span></label>
            <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
              <option value="">— Select —</option>
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <Field label="Description" value={description} onChange={setDescription} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
