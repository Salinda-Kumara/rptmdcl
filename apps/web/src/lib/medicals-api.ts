import apiClient from './api-client';

export interface EligibleExam {
  subjectId: string;
  code: string;
  name: string;
  examDate: string;
  intake?: string | null;
}

export interface MedicalItem {
  id: string;
  subjectId: string;
  examDate: string;
  usedByApplicationSubjectId?: string | null;
  subject: { id: string; code: string; name: string };
}

export interface MedicalDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
}

export interface MedicalSubmission {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  serialNumber?: string | null;
  totalDays?: number | null;
  applicantDetails?: any;
  reviewRemarks?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  items: MedicalItem[];
  documents?: MedicalDocument[];
  student?: { fullName: string; registrationNumber: string; batchNumber: string; nic: string };
}

// An approved, unused absence offered during the exam application.
export interface ApprovedMedical {
  itemId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  examDate: string;
  serialNumber: string;
  submissionId: string;
}

export const medicalsApi = {
  /* student */
  eligibleExams: () => apiClient.get<EligibleExam[]>('/medicals/my/eligible-exams').then((r) => r.data),
  approvedAvailable: () => apiClient.get<ApprovedMedical[]>('/medicals/my/approved-available').then((r) => r.data),
  listMine: () => apiClient.get<MedicalSubmission[]>('/medicals/my').then((r) => r.data),
  create: (data: { totalDays: number; items: { subjectId: string; examDate: string }[]; permanentAddress?: string; contactNumbers?: string }) =>
    apiClient.post<MedicalSubmission>('/medicals', data).then((r) => r.data),
  uploadCertificate: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<MedicalDocument>(`/medicals/my/${id}/certificate`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  submit: (id: string) => apiClient.patch<MedicalSubmission>(`/medicals/my/${id}/submit`).then((r) => r.data),

  /* staff */
  listStaff: (status?: string) =>
    apiClient.get<MedicalSubmission[]>('/medicals', { params: status ? { status } : {} }).then((r) => r.data),
  getStaff: (id: string) => apiClient.get<MedicalSubmission>(`/medicals/${id}`).then((r) => r.data),
  review: (id: string, action: 'APPROVE' | 'REJECT', remark?: string) =>
    apiClient.patch<MedicalSubmission>(`/medicals/${id}/review`, { action, remark }).then((r) => r.data),
};

export const MEDICAL_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Not Approved',
};

export const MEDICAL_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};
