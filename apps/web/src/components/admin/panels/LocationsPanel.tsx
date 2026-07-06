'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminExamLocation } from '@/lib/admin-api';

export function LocationsPanel() {
  const [items, setItems] = useState<AdminExamLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminExamLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.listExamLocations().then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setName(''); setCapacity(''); setNote(''); setError(''); setModalOpen(true); };
  const openEdit = (l: AdminExamLocation) => { setEditing(l); setName(l.name); setCapacity(l.capacity != null ? String(l.capacity) : ''); setNote(l.note || ''); setError(''); setModalOpen(true); };

  const save = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), capacity: capacity ? Number(capacity) : undefined, note: note.trim() || undefined };
      if (editing) await adminApi.updateExamLocation(editing.id, payload);
      else await adminApi.createExamLocation(payload);
      setModalOpen(false); load();
    } catch (e: any) { setError(e.response?.data?.message?.toString() || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (l: AdminExamLocation) => {
    if (!confirm(`Remove location "${l.name}"?`)) return;
    await adminApi.deleteExamLocation(l.id); load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><MapPin className="h-6 w-6 text-amber-500" /> Locations</h1>
          <p className="mt-1 text-sm text-slate-500">Exam venues / halls available for allocation. Suggested when scheduling exams.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
          <Plus className="h-4 w-4" /> Add Location
        </button>
      </div>

      {loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-white" />)}</div>
      : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No locations added yet.</div>
      : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><MapPin className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{l.name}</p>
                <p className="truncate text-xs text-slate-400">{[l.capacity != null ? `Capacity ${l.capacity}` : null, l.note].filter(Boolean).join(' · ') || '—'}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEdit(l)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(l)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Location' : 'Add Location'}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Add'}
          </button>
        </>}
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
          <Field label="Name" value={name} onChange={setName} required placeholder="Level 1 Main Hall — CA Sri Lanka" />
          <Field label="Capacity" value={capacity} onChange={setCapacity} type="number" placeholder="Optional" />
          <Field label="Note" value={note} onChange={setNote} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
