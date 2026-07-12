import apiClient from './api-client';

export interface Subject {
  id: string;
  code: string;
  name: string;
  category: string;
}

export interface ApplicationSubject {
  id: string;
  subjectId: string;
  category: string;
  caMarks?: number;
  subject: Subject;
  admissionPrinted?: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  referenceNumber: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string;
}

export type DocumentType = 'PAYMENT_SLIP' | 'MEDICAL_CERTIFICATE' | 'SUPPORTING_DOCUMENT';

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface Application {
  id: string;
  type: 'MEDICAL' | 'REPEAT';
  status: string;
  totalFee: number;
  serialNumber?: string;
  paymentReferenceId?: string;
  submittedAt?: string;
  createdAt: string;
  applicationSubjects: ApplicationSubject[];
  payment?: Payment;
  documents?: ApplicationDocument[];
  applicantDetails?: ApplicantDetails;
  approvals: Array<{ stage: number; status: string; approvedAt?: string }>;
  remarks?: Array<{ id: string; content: string; createdAt: string; user: any }>;
}

export interface ApplicantDetails {
  fullName?: string;
  nameWithInitials?: string;
  permanentAddress?: string;
  postalAddress?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  // Identity (read-only on the snapshot, set server-side)
  registrationNumber?: string;
  nic?: string;
  batchNumber?: string;
  intake?: string;
}

export interface CreateApplicationData {
  type: 'MEDICAL' | 'REPEAT';
  applicant?: ApplicantDetails;
  subjects: Array<{
    subjectId: string;
    category: 'MEDICAL' | 'REPEAT' | '1ST_ATTEMPT';
    caMarks?: number;
  }>;
}

export const applicationsApi = {
  create: (data: CreateApplicationData) =>
    apiClient.post<Application>('/applications', data).then((r) => r.data),

  getMyApplications: () =>
    apiClient.get<Application[]>('/applications/my').then((r) => r.data),

  getMyApplication: (id: string) =>
    apiClient.get<Application>(`/applications/my/${id}`).then((r) => r.data),

  submit: (id: string, paymentReferenceId: string) =>
    apiClient
      .patch<Application>(`/applications/my/${id}/submit`, { paymentReferenceId })
      .then((r) => r.data),

  cancel: (id: string) =>
    apiClient.delete(`/applications/my/${id}`).then((r) => r.data),

  // Staff
  getAllApplications: (params?: { status?: string; type?: string; search?: string }) =>
    apiClient.get<Application[]>('/applications', { params }).then((r) => r.data),

  getApplication: (id: string) =>
    apiClient.get<Application>(`/applications/${id}`).then((r) => r.data),
};

export interface ExamSchedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  programmeId: string;
  description?: string;
}

// A published timetable row — used to auto-fill a subject's upcoming exam
// date + intake from the exam schedule (matched by course code).
export interface ScheduledExamInfo {
  courseCode?: string | null;
  courseName?: string | null;
  intake?: string | null;
  examDate?: string | null;
  revisedDate?: string | null;
}

export const studentsApi = {
  getProfile: () => apiClient.get('/students/profile').then((r) => r.data),
  getSubjects: () => apiClient.get<Subject[]>('/students/subjects').then((r) => r.data),
  getExamSchedules: () => apiClient.get<ExamSchedule[]>('/students/exam-schedules').then((r) => r.data),
  getScheduledExams: () => apiClient.get<ScheduledExamInfo[]>('/students/scheduled-exams').then((r) => r.data),
  // Update ONLY permanent address, mobile and email on the master student record.
  updateContact: (data: { permanentAddress?: string; mobile?: string; email?: string }) =>
    apiClient.patch('/students/profile/contact', data).then((r) => r.data),
};

export const documentsApi = {
  list: (applicationId: string) =>
    apiClient
      .get<ApplicationDocument[]>(`/applications/${applicationId}/documents`)
      .then((r) => r.data),

  upload: (applicationId: string, documentType: DocumentType, file: File) => {
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('file', file);
    return apiClient
      .post<ApplicationDocument>(`/applications/${applicationId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  remove: (documentId: string) =>
    apiClient.delete(`/documents/${documentId}`).then((r) => r.data),

  // Returns a blob URL the browser can open/view
  downloadUrl: async (documentId: string) => {
    const res = await apiClient.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  },
};

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  PAYMENT_SLIP: 'Payment Slip',
  MEDICAL_CERTIFICATE: 'Medical Certificate',
  SUPPORTING_DOCUMENT: 'Supporting Document',
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PAYMENT_PENDING: 'Payment Verification Pending',
  PAYMENT_VERIFIED: 'Payment Verified',
  PAYMENT_REJECTED: 'Payment Rejected',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
  PAYMENT_VERIFIED: 'bg-emerald-100 text-emerald-700',
  PAYMENT_REJECTED: 'bg-red-100 text-red-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export function formatFee(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}
