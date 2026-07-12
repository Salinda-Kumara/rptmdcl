import { useEffect, useState } from 'react';
import apiClient from './api-client';

export type AccessLevel = 'VIEW' | 'FULL';
export type PermissionMap = Record<string, AccessLevel>;

export interface ResourceDef {
  key: string;
  label: string;
  description: string;
  viewOnly?: boolean;
}

// Mirror of apps/api/src/auth/permissions.ts
export const RESOURCES: ResourceDef[] = [
  { key: 'applications', label: 'Applications', description: 'Full can verify, forward and reject' },
  { key: 'payments', label: 'Payments', description: 'Full can approve / reject payment verification' },
  { key: 'rollback', label: 'Application Rollback', description: 'Full can roll an application back to its previous status' },
  { key: 'students', label: 'Students', description: 'Full can create, edit, delete and import' },
  { key: 'programmes', label: 'Programmes', description: 'Full can manage programmes' },
  { key: 'subjects', label: 'Subjects', description: 'Full can manage subjects' },
  { key: 'batches', label: 'Batches', description: 'Full can manage batches' },
  { key: 'schedules', label: 'Exam Schedules', description: 'Full can manage exam schedules' },
  { key: 'reports', label: 'Reports', description: 'View reporting dashboards', viewOnly: true },
  { key: 'admissions', label: 'Admissions', description: 'View approved applications and print admission cards', viewOnly: true },
  { key: 'users', label: 'Staff & Permissions', description: 'Full can create staff and assign permissions' },
];

const RANK: Record<AccessLevel, number> = { VIEW: 1, FULL: 2 };

/** Does this permission map grant at least `level` on `resource`? */
export function can(perms: PermissionMap | undefined, resource: string, level: AccessLevel = 'VIEW'): boolean {
  const have = perms?.[resource];
  if (!have) return false;
  return RANK[have] >= RANK[level];
}

export interface MyAuth {
  isAdmin: boolean;
  permissions: PermissionMap;
  name?: string;
  email?: string;
  loading: boolean;
}

/** Fetch the current user's effective permissions from /auth/profile.
 *
 * The API returns:
 *   { isAdmin: bool, permissions: { resource: level }, user: { staffUser, email, ... } }
 */
export function useMyPermissions(): MyAuth {
  const [state, setState] = useState<MyAuth>({ isAdmin: false, permissions: {}, loading: true });

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      apiClient
        .get('/auth/profile')
        .then((r) => {
          if (cancelled) return;
          const d = r.data;
          setState({
            isAdmin: !!d?.isAdmin,
            // permissions is already a resource→level map from effectivePermissions()
            permissions: (d?.permissions ?? {}) as PermissionMap,
            name: d?.user?.staffUser?.name || d?.user?.email,
            email: d?.user?.email,
            loading: false,
          });
        })
        .catch(() => { if (!cancelled) setState((s) => ({ ...s, loading: false })); });
    };

    load();

    // Re-check permissions when the tab regains focus, so a permission an admin
    // just granted appears without the user having to log out and back in.
    const onFocus = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  return state;
}
