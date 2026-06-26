'use client';

import React, { useEffect, useState } from 'react';
import {
  Layers, Plus, Pencil, Trash2, Loader2, AlertCircle,
  Users, ArrowLeft, Search, GraduationCap,
} from 'lucide-react';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminBatch, AdminProgramme, AdminStudent } from '@/lib/admin-api';
import { useMyPermissions, can } from '@/lib/permissions';

const PAGE = 50;

/* ─── Batch detail: student list ─── */
function BatchDetailView({ batch, onBack }: { batch: AdminBatch; onBack: () => void }) {
  const [items, setItems] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = (reset = false) => {
    setLoading(true);
    const nextSkip = reset ? 0 : skip;
    adminApi.listStudents({
      batchNumber: batch.batchNumber,
      intake: batch.intake,
      search: search.trim() || undefined,
      take: PAGE,
      skip: nextSkip,
    }).then((d) => { setItems(d.items); setTotal(d.total); if (reset) setSkip(0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(() => load(true), search ? 350 : 0); return () => clearTimeout(t); }, [search]); // eslint-disable-line
  useEffect(() => { load(); }, [skip]); // eslint-disable-line

  return (
    <div>
      <button onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to Batches
      </button>

      {/* Batch info card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
        <div className="flex flex-wrap items-center gap-4 px-6 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{batch.batchNumber}</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Intake {batch.intake} · {batch.programme?.code} — {batch.programme?.name}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-2">
          <div className="bg-white px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Programme</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{batch.programme?.code} — {batch.programme?.name}</p>
          </div>
          <div className="bg-white px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Students</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{total}</p>
          </div>
        </div>
      </div>

      {/* Student list */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Students in this batch</h2>
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, reg no, NIC…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">No students{search ? ' matching the search' : ' in this batch yet'}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">Registration No</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">NIC</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{s.registrationNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.title ? `${s.title} ` : ''}{s.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.nic || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.mobile || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{s.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">{skip + 1}–{Math.min(skip + PAGE, total)} of {total.toLocaleString()}</span>
            <div className="flex gap-2">
              <button onClick={() => setSkip(Math.max(0, skip - PAGE))} disabled={skip === 0}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setSkip(skip + PAGE)} disabled={skip + PAGE >= total}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main Batches panel ─── */
export function BatchesPanel() {
  const { isAdmin, permissions } = useMyPermissions();
  const canEdit = isAdmin || can(permissions, 'batches', 'FULL');

  const [batches, setBatches] = useState<AdminBatch[]>([]);
  const [programmes, setProgrammes] = useState<AdminProgramme[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [intake, setIntake] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<AdminBatch | null>(null);
  const [editProgrammeId, setEditProgrammeId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Drill-down
  const [selectedBatch, setSelectedBatch] = useState<AdminBatch | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listBatches(), adminApi.listProgrammes()])
      .then(([b, p]) => { setBatches(b); setProgrammes(p); }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => {
    setBatchNumber(''); setIntake(''); setProgrammeId(programmes[0]?.id || ''); setError(''); setCreateOpen(true);
  };
  const openEdit = (b: AdminBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBatch(b); setEditProgrammeId(b.programmeId); setEditError(''); setEditOpen(true);
  };

  const create = async () => {
    setError('');
    if (!batchNumber.trim() || !intake.trim() || !programmeId) { setError('All fields are required'); return; }
    setSaving(true);
    try { await adminApi.createBatch({ batchNumber, intake, programmeId }); setCreateOpen(false); load(); }
    catch (e: any) { setError(e.response?.data?.message?.toString() || 'Save failed'); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editingBatch || !editProgrammeId) { setEditError('Select a programme'); return; }
    setEditSaving(true); setEditError('');
    try {
      await adminApi.updateBatch(editingBatch.batchNumber, editingBatch.intake, { programmeId: editProgrammeId });
      setEditOpen(false); load();
    } catch (e: any) { setEditError(e.response?.data?.message?.toString() || 'Save failed'); }
    finally { setEditSaving(false); }
  };

  const remove = async (b: AdminBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete batch "${b.batchNumber}" (${b.intake})?`)) return;
    await adminApi.deleteBatch(b.batchNumber, b.intake); load();
  };

  if (selectedBatch) {
    return <BatchDetailView batch={selectedBatch} onBack={() => setSelectedBatch(null)} />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Layers className="h-6 w-6 text-amber-500" /> Batches</h1>
          <p className="mt-1 text-sm text-slate-500">Student batches per programme &amp; intake. Click a row to view students.</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} disabled={programmes.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50">
            <Plus className="h-4 w-4" /> New Batch
          </button>
        )}
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
                <tr key={`${b.batchNumber}-${b.intake}`}
                  onClick={() => setSelectedBatch(b)}
                  className="cursor-pointer border-b border-slate-50 last:border-0 transition-colors hover:bg-amber-50/40">
                  <td className="px-6 py-3 font-semibold text-slate-900">{b.batchNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{b.intake}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{b.programme?.code} — {b.programme?.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Users className="h-3.5 w-3.5" /> {b._count?.students ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <button onClick={(e) => openEdit(b, e)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-amber-600"
                          title="Edit programme">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={(e) => remove(b, e)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete batch">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Batch"
        footer={<>
          <button onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={create} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </button>
        </>}
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch Number" value={batchNumber} onChange={(v) => setBatchNumber(v.toUpperCase())} required placeholder="AA22-105" />
            <Field label="Intake" value={intake} onChange={setIntake} required placeholder="2022-01" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Programme <span className="text-red-500">*</span></label>
            <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
              <option value="">— Select —</option>
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Batch"
        footer={<>
          <button onClick={() => setEditOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={saveEdit} disabled={editSaving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {editSaving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </>}
      >
        <div className="space-y-4">
          {editError && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {editError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Batch Number</label>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{editingBatch?.batchNumber}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Intake</label>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{editingBatch?.intake}</p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Programme <span className="text-red-500">*</span></label>
            <select value={editProgrammeId} onChange={(e) => setEditProgrammeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100">
              <option value="">— Select —</option>
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
