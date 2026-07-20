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
  paymentPending: number;
  paymentVerified: number;
  paymentRejected: number;
  sectionNew: number;
  sectionFinance: number;
  sectionVerified: number;
  sectionRejected: number;
  byType: { repeat: number; medical: number };
  pendingPayments: number;
  verifiedRevenue: number;
}

export interface StaffApplication extends Application {
  student?: {
    id: string;
    fullName: string;
    nameWithInitials?: string | null;
    batchNumber: string;
    registrationNumber: string;
    nic: string;
    email: string;
    mobile: string;
  };
}

// A timetable row used to fill the admission card's Date/Time columns.
export interface AdmissionExam {
  courseCode?: string | null;
  courseName?: string | null;
  examDate?: string | null;
  revisedDate?: string | null;
  session1?: string | null;
  session2?: string | null;
  session3?: string | null;
  location?: string | null;
  intake?: string | null;
  schedule?: { startDate?: string | null; endDate?: string | null } | null;
}

export const staffApi = {
  getStats: () => apiClient.get<StaffStats>('/applications/stats').then((r) => r.data),

  getApplications: (params?: { status?: string; statuses?: string[]; type?: string; search?: string; dateFrom?: string; dateTo?: string }) => {
    const p: Record<string, string> = {};
    if (params?.status) p.status = params.status;
    if (params?.statuses?.length) p.statuses = params.statuses.join(',');
    if (params?.type) p.type = params.type;
    if (params?.search) p.search = params.search;
    if (params?.dateFrom) p.dateFrom = params.dateFrom;
    if (params?.dateTo) p.dateTo = params.dateTo;
    return apiClient.get<StaffApplication[]>('/applications', { params: p }).then((r) => r.data);
  },

  getApplication: (id: string) =>
    apiClient.get<StaffApplication>(`/applications/${id}`).then((r) => r.data),

  // Admissions — approved applications and the exam timetable for admission cards.
  getAdmissions: () =>
    apiClient.get<StaffApplication[]>('/applications/admissions').then((r) => r.data),
  getAdmissionExams: () =>
    apiClient.get<AdmissionExam[]>('/applications/admissions/exams').then((r) => r.data),
  markAdmissionPrinted: (subjectId: string, printed: boolean) =>
    apiClient.patch(`/applications/admissions/${subjectId}/printed`, { printed }).then((r) => r.data),

  examReview: (id: string, action: 'FORWARD' | 'REJECT' | 'RETURN', remark?: string) =>
    apiClient.patch<StaffApplication>(`/applications/${id}/exam-review`, { action, remark }).then((r) => r.data),

  // Exam Division — decline a single subject while forwarding the rest.
  declineSubject: (id: string, subjectId: string, reason: string) =>
    apiClient.patch<StaffApplication>(`/applications/${id}/subjects/${subjectId}/decline`, { reason }).then((r) => r.data),

  financeReview: (id: string, action: 'APPROVE' | 'REJECT', remark?: string) =>
    apiClient.patch<StaffApplication>(`/applications/${id}/payment-review`, { action, remark }).then((r) => r.data),

  // Stage 3 — Exam Registrar final approval (requires the `approvals` permission).
  finalApprove: (id: string, remark?: string) =>
    apiClient.patch<StaffApplication>(`/applications/${id}/final-approve`, { remark }).then((r) => r.data),

  // Stage 3 — reject a payment-verified application (remark required).
  finalReject: (id: string, remark: string) =>
    apiClient.patch<StaffApplication>(`/applications/${id}/final-reject`, { remark }).then((r) => r.data),

  // Stage 3 — approve several applications at once.
  finalApproveBulk: (ids: string[], remark?: string) =>
    apiClient.patch<{ approved: string[]; skipped: string[] }>(`/applications/final-approve/bulk`, { ids, remark }).then((r) => r.data),

  // Roll an application back to its previous status (requires the `rollback`
  // permission and the acting user's password for confirmation).
  rollback: (id: string, password: string, remark?: string) =>
    apiClient.patch<StaffApplication>(`/applications/${id}/rollback`, { password, remark }).then((r) => r.data),

  documentUrl: async (documentId: string) => {
    const res = await apiClient.get(`/documents/${documentId}/download`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },

  // Raw bytes of a document — used to merge attachments into a printed form.
  // Fetch as a blob (same proven path as documentUrl), then read its ArrayBuffer.
  documentBytes: async (documentId: string): Promise<{ bytes: Uint8Array; mimeType: string }> => {
    const res = await apiClient.get(`/documents/${documentId}/download`, { responseType: 'blob' });
    const blob = res.data as Blob;
    const buf = await blob.arrayBuffer();
    const mimeType = blob.type || (res.headers?.['content-type'] as string) || 'application/octet-stream';
    return { bytes: new Uint8Array(buf), mimeType };
  },

  getProfile: () => apiClient.get('/auth/profile').then((r) => r.data),

  // Staff password reset (OTP flow).
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/staff/forgot-password', { email }).then((r) => r.data),
  verifyResetOtp: (email: string, otp: string) =>
    apiClient.post<{ resetToken: string }>('/auth/staff/verify-reset-otp', { email, otp }).then((r) => r.data),
  resetPassword: (resetToken: string, newPassword: string) =>
    apiClient.post<{ message: string }>('/auth/staff/reset-password', { resetToken, newPassword }).then((r) => r.data),
};

export function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}
