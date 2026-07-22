// Single source of truth for the feature/permission catalog (PBAC).
// Each feature has two grantable access levels: VIEW (read-only) and FULL (read+write).
// Absence of a grant means no access. Master Admins (User.isAdmin) bypass all checks.

export type AccessLevel = 'VIEW' | 'FULL';

export interface ResourceDef {
  key: string;
  label: string;
  description: string;
  /** When true, only VIEW is meaningful (no write actions). */
  viewOnly?: boolean;
}

export const RESOURCES: ResourceDef[] = [
  { key: 'applications', label: 'Applications', description: 'Review applications; Full can verify, forward and reject' },
  { key: 'payments', label: 'Payments', description: 'Full can approve or reject payment verification' },
  { key: 'approvals', label: 'Final Approval', description: 'Full can give final approval to payment-verified applications (Exam Registrar)' },
  { key: 'rollback', label: 'Application Rollback', description: 'Full can roll an application back to its previous status' },
  { key: 'students', label: 'Students', description: 'Full can create, edit, delete and import students' },
  { key: 'programmes', label: 'Programmes', description: 'Full can manage degree programmes' },
  { key: 'subjects', label: 'Subjects', description: 'Full can manage subjects' },
  { key: 'batches', label: 'Batches', description: 'Full can manage batches' },
  { key: 'schedules', label: 'Exam Schedules', description: 'Full can manage examination schedules' },
  { key: 'reports', label: 'Reports', description: 'View reporting dashboards', viewOnly: true },
  { key: 'analytics', label: 'Analytics', description: 'View the analytics dashboard (application trends, demand by subject/batch)', viewOnly: true },
  { key: 'admissions', label: 'Admissions', description: 'View approved applications and print admission cards', viewOnly: true },
  { key: 'users', label: 'Staff & Permissions', description: 'Full can create staff and assign permissions' },
];

export const RESOURCE_KEYS = RESOURCES.map((r) => r.key);

/** Level hierarchy — FULL satisfies a VIEW requirement. */
const RANK: Record<AccessLevel, number> = { VIEW: 1, FULL: 2 };

export function levelSatisfies(have: AccessLevel | undefined, need: AccessLevel): boolean {
  if (!have) return false;
  return RANK[have] >= RANK[need];
}

/**
 * Build the effective permission map for a user.
 * Admins implicitly get FULL on every resource.
 */
export function effectivePermissions(user: any): Record<string, AccessLevel> {
  if (user?.isAdmin) {
    return Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 'FULL'])) as Record<string, AccessLevel>;
  }
  const map: Record<string, AccessLevel> = {};
  for (const p of user?.permissions ?? []) {
    map[p.resource] = p.level;
  }
  return map;
}
