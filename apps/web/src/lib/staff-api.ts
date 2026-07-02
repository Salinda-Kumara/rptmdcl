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
    batchNumber: string;
    registrationNumber: string;
    nic: string;
    email: string;
    mobile: string;
  };
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

  examReview: (id: string, action: 'FORWARD' | 'REJECT', remark?: string) =>
    apiClient.patch<StaffApplication>(`/applications/${id}/exam-review`, { action, remark }).then((r) => r.data),

  financeReview: (id: string, action: 'APPROVE' | 'REJECT', remark?: string) =>
    apiClient.patch<StaffApplication>(`/applications/${id}/payment-review`, { action, remark }).then((r) => r.data),

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
};

export function formatLKR(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}
