import apiClient from './api-client';
import { Application } from './applications-api';

export interface StaffStats {
  total: number;
  pending: number;
  submitted: number;
  underReview: number;
  returned: number;
  approved: number;
  rejected: number;
  byType: { repeat: number; medical: number };
  pendingPayments: number;
  verifiedRevenue: number;
}

export interface StaffApplication extends Application {
  student?: {
    id: string;
    fullName: string;
    batchNumber: string;
    registrationNumber: string;
    nic: string;
    email: string;
    mobile: string;
  };
}

export const staffApi = {
  getStats: () => apiClient.get<StaffStats>('/applications/stats').then((r) => r.data),

  getApplications: (params?: { status?: string; type?: string; search?: string }) =>
    apiClient.get<StaffApplication[]>('/applications', { params }).then((r) => r.data),

  getApplication: (id: string) =>
    apiClient.get<StaffApplication>(`/applications/${id}`).then((r) => r.data),

  // Exam Division: forward to finance or reject (remark required for reject)
  examReview: (id: string, action: 'FORWARD' | 'REJECT', remark?: string) =>
    apiClient
      .patch<StaffApplication>(`/applications/${id}/exam-review`, { action, remark })
      .then((r) => r.data),

  // Open a document (staff are allowed to download any application's docs)
  documentUrl: async (documentId: string) => {
    const res = await apiClient.get(`/documents/${documentId}/download`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },

  // Current staff member's profile + roles
  getProfile: () =>
    apiClient.get('/auth/profile').then((r) => r.data?.user),
};

// Extract role names from the /auth/profile user payload.
export function rolesOf(user: any): string[] {
  if (!user?.roles) return [];
  return user.roles.map((r: any) => r?.role?.name).filter(Boolean);
}

export const ROLE_LABELS: Record<string, string> = {
  FINANCE_OFFICER: 'Finance Officer',
  VERIFICATION_OFFICER: 'Verification Officer',
  SCHEDULE_OFFICER: 'Schedule Officer',
  EXAM_MANAGER: 'Exam Manager',
  REGISTRAR: 'Registrar',
  DIRECTOR: 'Director',
  SUPER_ADMIN: 'Super Admin',
};

export function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}
