'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Ban, RotateCcw, ShieldCheck, Crown, Loader2, AlertCircle } from 'lucide-react';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminUser } from '@/lib/admin-api';
import { RESOURCES, AccessLevel } from '@/lib/permissions';

type Level = 'NONE' | AccessLevel;

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [matrix, setMatrix] = useState<Record<string, Level>>({});

  const load = () => { setLoading(true); adminApi.listUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const emptyMatrix = () => Object.fromEntries(RESOURCES.map((r) => [r.key, 'NONE'])) as Record<string, Level>;

  const openCreate = () => {
    setEditing(null); setEmail(''); setName(''); setPosition(''); setPassword(''); setIsAdmin(false);
    setMatrix(emptyMatrix()); setError(''); setModalOpen(true);
  };
  const openEdit = (u: AdminUser) => {
    setEditing(u); setEmail(u.email); setName(u.staffUser?.name || ''); setPosition(u.staffUser?.position || '');
    setPassword(''); setIsAdmin(u.isAdmin);
    const m = emptyMatrix();
    for (const p of u.permissions) m[p.resource] = p.level;
    setMatrix(m); setError(''); setModalOpen(true);
  };
  const setLevel = (resource: string, level: Level) => setMatrix((prev) => ({ ...prev, [resource]: level }));
  const grantsFromMatrix = () => RESOURCES.filter((r) => matrix[r.key] && matrix[r.key] !== 'NONE').map((r) => ({ resource: r.key, level: matrix[r.key] as AccessLevel }));

  const save = async () => {
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!editing && !password.trim()) { setError('Email and password are required'); return; }
    if (!name.trim() || !position.trim()) { setError('Name and position are required'); return; }
    const permissions = grantsFromMatrix();
    if (!isAdmin && permissions.length === 0) { setError('Grant at least one permission, or mark as Master Admin'); return; }
    setSaving(true);
    try {
      if (editing) await adminApi.updateUser(editing.id, { email: email.trim(), name, position, isAdmin, permissions, ...(password ? { password } : {}) });
      else await adminApi.createUser({ email, password, name, position, isAdmin, permissions });
      setModalOpen(false); load();
    } catch (e: any) { setError(e.response?.data?.message?.toString() || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deactivate = async (u: AdminUser) => {
    if (!confirm(`Deactivate ${u.staffUser?.name || u.email}? They will no longer be able to log in.`)) return;
    await adminApi.deactivateUser(u.id); load();
  };

  const activate = async (u: AdminUser) => {
    if (!confirm(`Reactivate ${u.staffUser?.name || u.email}? They will be able to log in again.`)) return;
    await adminApi.activateUser(u.id); load();
  };

  const resourceLabel = (key: string) => RESOURCES.find((r) => r.key === key)?.label || key;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Users className="h-6 w-6 text-amber-500" /> Staff &amp; Permissions</h1>
          <p className="mt-1 text-sm text-slate-500">Create staff accounts and grant per-feature access.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
          <Plus className="h-4 w-4" /> New Staff
        </button>
      </div>

      {loading ? <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />)}</div>
      : users.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No staff users yet.</div>
      : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Access</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {users.map((u) => {
                const inactive = !!u.deletedAt;
                return (
                <tr key={u.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${inactive ? 'bg-slate-50/40' : ''}`}>
                  <td className={`px-6 py-3.5 ${inactive ? 'opacity-60' : ''}`}><p className="font-semibold text-slate-900">{u.staffUser?.name || '—'}</p><p className="text-xs text-slate-400">{u.staffUser?.position}</p></td>
                  <td className={`px-4 py-3.5 text-slate-600 ${inactive ? 'opacity-60' : ''}`}>{u.email}</td>
                  <td className={`px-4 py-3.5 ${inactive ? 'opacity-60' : ''}`}>
                    {u.isAdmin ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><Crown className="h-3 w-3" /> Master Admin</span>
                    : u.permissions.length === 0 ? <span className="text-xs text-slate-400">No access</span>
                    : <div className="flex flex-wrap gap-1">{u.permissions.map((p) => (
                        <span key={p.resource} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${p.level === 'FULL' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          <ShieldCheck className="h-3 w-3" /> {resourceLabel(p.resource)}: {p.level === 'FULL' ? 'Full' : 'View'}
                        </span>
                      ))}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    {inactive
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">Inactive</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span>}
                  </td>
                  <td className="px-4 py-3.5"><div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(u)} title="Edit" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600"><Pencil className="h-4 w-4" /></button>
                    {inactive
                      ? <button onClick={() => activate(u)} title="Reactivate" className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"><RotateCcw className="h-4 w-4" /></button>
                      : <button onClick={() => deactivate(u)} title="Deactivate" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Ban className="h-4 w-4" /></button>}
                  </div></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Staff User' : 'New Staff User'}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save Changes' : 'Create User'}
          </button>
        </>}
      >
        <div className="space-y-4">
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
          <Field label="Email" value={email} onChange={setEmail} type="email" required placeholder="officer@example.com" />
          {editing && <p className="-mt-2 text-[11px] text-slate-400">Email cannot be changed.</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={name} onChange={setName} required />
            <Field label="Position" value={position} onChange={setPosition} required placeholder="Finance Officer" />
          </div>
          <Field label={editing ? 'New Password (leave blank to keep)' : 'Password'} value={password} onChange={setPassword} type="password" required={!editing} placeholder="••••••••" />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="h-4 w-4 rounded text-amber-600" />
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-800"><Crown className="h-4 w-4" /> Master Admin — full access to everything</span>
          </label>
          <div className={isAdmin ? 'pointer-events-none opacity-40' : ''}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Feature Permissions</p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {RESOURCES.map((r, i) => {
                const level = matrix[r.key] || 'NONE';
                const options: Level[] = r.viewOnly ? ['NONE', 'VIEW'] : ['NONE', 'VIEW', 'FULL'];
                return (
                  <div key={r.key} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{r.label}</p>
                      <p className="truncate text-[11px] text-slate-400">{r.description}</p>
                    </div>
                    <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200">
                      {options.map((opt) => (
                        <button key={opt} type="button" onClick={() => setLevel(r.key, opt)}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${level === opt ? (opt === 'FULL' ? 'bg-emerald-500 text-white' : opt === 'VIEW' ? 'bg-indigo-500 text-white' : 'bg-slate-300 text-slate-700') : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                          {opt === 'NONE' ? 'None' : opt === 'VIEW' ? 'View' : 'Full'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
