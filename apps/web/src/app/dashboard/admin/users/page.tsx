'use client';

import React, { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Modal, Field } from '@/components/admin/Modal';
import { adminApi, AdminUser, Role, ROLE_LABELS } from '@/lib/admin-api';

const ASSIGNABLE_ROLES = [
  'FINANCE_OFFICER', 'VERIFICATION_OFFICER', 'SCHEDULE_OFFICER',
  'EXAM_MANAGER', 'REGISTRAR', 'DIRECTOR', 'ADMIN',
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.listUsers(), adminApi.listRoles()])
      .then(([u, r]) => { setUsers(u); setRoles(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const roleNames = roles.length > 0
    ? roles.map((r) => r.name).filter((n) => ASSIGNABLE_ROLES.includes(n))
    : ASSIGNABLE_ROLES;

  const openCreate = () => {
    setEditing(null);
    setEmail(''); setName(''); setPosition(''); setPassword(''); setSelectedRoles([]);
    setError(''); setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setEmail(u.email);
    setName(u.staffUser?.name || '');
    setPosition(u.staffUser?.position || '');
    setPassword('');
    setSelectedRoles(u.roles.map((r) => r.role.name));
    setError(''); setModalOpen(true);
  };

  const toggleRole = (role: string) =>
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const save = async () => {
    setError('');
    if (!editing && (!email.trim() || !password.trim())) { setError('Email and password are required'); return; }
    if (!name.trim() || !position.trim()) { setError('Name and position are required'); return; }
    if (selectedRoles.length === 0) { setError('Assign at least one role'); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateUser(editing.id, {
          name, position, roles: selectedRoles, ...(password ? { password } : {}),
        });
      } else {
        await adminApi.createUser({ email, password, name, position, roles: selectedRoles });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Save failed');
    } finally { setSaving(false); }
  };

  const deactivate = async (u: AdminUser) => {
    if (!confirm(`Deactivate ${u.staffUser?.name || u.email}? They will no longer be able to log in.`)) return;
    await adminApi.deactivateUser(u.id);
    load();
  };

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users className="h-6 w-6 text-amber-500" /> Staff &amp; Roles
          </h1>
          <p className="mt-1 text-sm text-slate-500">Create staff accounts and assign their roles.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" /> New Staff
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />)}</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
          No staff users yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-6 py-3.5">
                    <p className="font-semibold text-slate-900">{u.staffUser?.name || '—'}</p>
                    <p className="text-xs text-slate-400">{u.staffUser?.position}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r.role.id} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          <ShieldCheck className="h-3 w-3" /> {ROLE_LABELS[r.role.name] || r.role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deactivate(u)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Deactivate">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Staff User' : 'New Staff User'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create User'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <Field label="Email" value={email} onChange={setEmail} type="email" required placeholder="officer@example.com" />
          {editing && <p className="-mt-2 text-[11px] text-slate-400">Email cannot be changed.</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={name} onChange={setName} required />
            <Field label="Position" value={position} onChange={setPosition} required placeholder="Finance Officer" />
          </div>
          <Field
            label={editing ? 'New Password (leave blank to keep)' : 'Password'}
            value={password} onChange={setPassword} type="password"
            required={!editing} placeholder="••••••••"
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Roles <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {roleNames.map((role) => {
                const on = selectedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      on ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {ROLE_LABELS[role] || role}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
