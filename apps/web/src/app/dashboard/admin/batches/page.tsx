'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, Loader2, AlertCircle, Users } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminBatch, AdminProgramme } from '@/lib/admin-api';

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [programmes, setProgrammes] = useState<AdminProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [batchNumber, setBatchNumber] = useState('');
  const [intake, setIntake] = useState('');
  const [programmeId, setProgrammeId] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listBatches(), adminApi.listProgrammes()])
      .then(([b, p]) => { setBatches(b); setProgrammes(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setBatchNumber(''); setIntake(''); setProgrammeId(programmes[0]?.id || '');
    setError(''); setModalOpen(true);
  };

  const save = async () => {
    setError('');
    if (!batchNumber.trim() || !intake.trim() || !programmeId) { setError('All fields are required'); return; }
    setSaving(true);
    try {
      await adminApi.createBatch({ batchNumber, intake, programmeId });
      setModalOpen(false); load();
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Save failed');
    } finally { setSaving(false); }
  };

  const remove = async (b: AdminBatch) => {
    if (!confirm(`Delete batch "${b.batchNumber}" (${b.intake})?`)) return;
    await adminApi.deleteBatch(b.batchNumber, b.intake);
    load();
  };

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Layers className="h-6 w-6 text-amber-500" /> Batches
          </h1>
          <p className="mt-1 text-sm text-slate-500">Student batches per programme &amp; intake.</p>
        </div>
        <button onClick={openCreate} disabled={programmes.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50">
          <Plus className="h-4 w-4" /> New Batch
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white" />)}</div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No batches yet.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">Batch No</th>
                <th className="px-4 py-3 font-medium">Intake</th>
                <th className="px-4 py-3 font-medium">Programme</th>
                <th className="px-4 py-3 font-medium">Students</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={`${b.batchNumber}-${b.intake}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-semibold text-slate-900">{b.batchNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{b.intake}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{b.programme?.code} — {b.programme?.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-slate-600"><Users className="h-3.5 w-3.5" /> {b._count?.students ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button onClick={() => remove(b)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title="New Batch"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch Number" value={batchNumber} onChange={(v) => setBatchNumber(v.toUpperCase())} required placeholder="AA22-105" />
            <Field label="Intake" value={intake} onChange={setIntake} required placeholder="2022-01" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Programme <span className="text-red-500">*</span></label>
            <select
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            >
              <option value="">— Select —</option>
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
