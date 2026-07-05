import apiClient from './api-client';

/* ──────────────── Types ──────────────── */
export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalStaff: number;
  totalProgrammes: number;
  totalSubjects: number;
  totalBatches: number;
  totalSchedules: number;
  totalApplications: number;
  statusCounts: Record<string, number>;
  verifiedRevenue: number;
}

export type AccessLevel = 'VIEW' | 'FULL';

export interface PermissionGrant {
  resource: string;
  level: AccessLevel;
}

export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  deletedAt?: string | null;
  staffUser?: { name: string; position: string } | null;
  permissions: { resource: string; level: AccessLevel }[];
}

export interface AdminProgramme {
  id: string;
  code: string;
  name: string;
  description?: string;
  _count?: { subjects: number; batches: number };
}

export interface AdminSubject {
  id: string;
  code: string;
  name: string;
  category: string;
  programmeId: string;
  programme?: { code: string; name: string };
}

export interface AdminBatch {
  batchNumber: string;
  intake: string;
  programmeId: string;
  programme?: { code: string; name: string };
  _count?: { students: number };
}

export interface AdminSchedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  programmeId?: string | null;
  description?: string;
  published?: boolean;
  publicToken?: string | null;
  publishedAt?: string | null;
}

export type ExamStaffRole = 'EXAMINER' | 'SUPERVISOR' | 'INVIGILATOR' | 'SUPPORTING' | 'OTHER';

export interface AdminExamStaff {
  id: string;
  name: string;
  role: ExamStaffRole;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  active: boolean;
}

export interface AdminScheduledExam {
  id: string;
  scheduleId: string;
  orderIndex: number;
  serialCode?: string | null;
  startAtLabel?: string | null;
  examDate?: string | null;
  weekday?: string | null;
  revisedDate?: string | null;
  intake?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
  expectedCount?: number | null;
  session1?: string | null;
  session2?: string | null;
  session3?: string | null;
  location?: string | null;
  chiefExaminerIds: string[];
  supervisorIds: string[];
  invigilatorIds: string[];
  supportingIds: string[];
}

export type ScheduledExamInput = Partial<Omit<AdminScheduledExam, 'id' | 'scheduleId'>>;

export interface AdminStudent {
  id: string;
  registrationNumber: string;
  nic: string;
  fullName: string;
  nameWithInitials?: string;
  title?: string;
  gender?: string;
  email?: string;
  mobile?: string;
  telephone?: string;
  permanentAddress?: string;
  postalAddress?: string;
  batchNumber: string;
  intake: string;
}

export interface ImportResult {
  dryRun: boolean;
  total: number;
  toImport?: number;
  imported?: number;
  willCreate?: number;
  willUpdate?: number;
  created?: number;
  updated?: number;
  skipped: number;
  duplicateRegNumbers: number;
  mergedDuplicatePersons: number;
  failed?: number;
  errors?: { registrationNumber: string; message: string }[];
  sample?: { registrationNumber: string; fullName: string; nic: string; intake: string }[];
}

/* ──────────────── API ──────────────── */
export const adminApi = {
  getStats: () => apiClient.get<AdminStats>('/admin/stats').then((r) => r.data),

  // Users & permissions
  listUsers: () => apiClient.get<AdminUser[]>('/admin/users').then((r) => r.data),
  createUser: (data: { email: string; password: string; name: string; position: string; isAdmin?: boolean; permissions?: PermissionGrant[] }) =>
    apiClient.post<AdminUser>('/admin/users', data).then((r) => r.data),
  updateUser: (id: string, data: { name?: string; position?: string; password?: string; isAdmin?: boolean; permissions?: PermissionGrant[] }) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data),
  deactivateUser: (id: string) => apiClient.delete(`/admin/users/${id}`).then((r) => r.data),
  activateUser: (id: string) => apiClient.patch(`/admin/users/${id}/activate`).then((r) => r.data),

  // Programmes
  listProgrammes: () => apiClient.get<AdminProgramme[]>('/admin/programmes').then((r) => r.data),
  createProgramme: (data: { code: string; name: string; description?: string }) =>
    apiClient.post<AdminProgramme>('/admin/programmes', data).then((r) => r.data),
  updateProgramme: (id: string, data: { name?: string; description?: string }) =>
    apiClient.patch<AdminProgramme>(`/admin/programmes/${id}`, data).then((r) => r.data),
  deleteProgramme: (id: string) => apiClient.delete(`/admin/programmes/${id}`).then((r) => r.data),

  // Subjects
  listSubjects: (programmeId?: string) =>
    apiClient.get<AdminSubject[]>('/admin/subjects', { params: programmeId ? { programmeId } : {} }).then((r) => r.data),
  createSubject: (data: { code: string; name: string; category: string; programmeId: string }) =>
    apiClient.post<AdminSubject>('/admin/subjects', data).then((r) => r.data),
  updateSubject: (id: string, data: { code?: string; name?: string; category?: string }) =>
    apiClient.patch<AdminSubject>(`/admin/subjects/${id}`, data).then((r) => r.data),
  deleteSubject: (id: string) => apiClient.delete(`/admin/subjects/${id}`).then((r) => r.data),

  // Batches
  listBatches: () => apiClient.get<AdminBatch[]>('/admin/batches').then((r) => r.data),
  createBatch: (data: { batchNumber: string; intake: string; programmeId: string }) =>
    apiClient.post<AdminBatch>('/admin/batches', data).then((r) => r.data),
  updateBatch: (batchNumber: string, intake: string, data: { programmeId: string }) =>
    apiClient.patch<AdminBatch>(`/admin/batches/${encodeURIComponent(batchNumber)}/${encodeURIComponent(intake)}`, data).then((r) => r.data),
  deleteBatch: (batchNumber: string, intake: string) =>
    apiClient.delete(`/admin/batches/${encodeURIComponent(batchNumber)}/${encodeURIComponent(intake)}`).then((r) => r.data),

  // Exam schedules
  listSchedules: () => apiClient.get<AdminSchedule[]>('/admin/exam-schedules').then((r) => r.data),
  createSchedule: (data: { name: string; startDate: string; endDate: string; programmeId?: string; description?: string }) =>
    apiClient.post<AdminSchedule>('/admin/exam-schedules', data).then((r) => r.data),
  updateSchedule: (id: string, data: Partial<{ name: string; startDate: string; endDate: string; programmeId: string; description: string }>) =>
    apiClient.patch<AdminSchedule>(`/admin/exam-schedules/${id}`, data).then((r) => r.data),
  deleteSchedule: (id: string) => apiClient.delete(`/admin/exam-schedules/${id}`).then((r) => r.data),
  publishSchedule: (id: string) => apiClient.patch<AdminSchedule>(`/admin/exam-schedules/${id}/publish`).then((r) => r.data),
  unpublishSchedule: (id: string) => apiClient.patch<AdminSchedule>(`/admin/exam-schedules/${id}/unpublish`).then((r) => r.data),

  // Scheduled exams (timetable rows)
  listScheduledExams: (scheduleId: string) =>
    apiClient.get<AdminScheduledExam[]>(`/admin/exam-schedules/${scheduleId}/exams`).then((r) => r.data),
  createScheduledExam: (scheduleId: string, data: ScheduledExamInput) =>
    apiClient.post<AdminScheduledExam>(`/admin/exam-schedules/${scheduleId}/exams`, data).then((r) => r.data),
  updateScheduledExam: (id: string, data: ScheduledExamInput) =>
    apiClient.patch<AdminScheduledExam>(`/admin/scheduled-exams/${id}`, data).then((r) => r.data),
  deleteScheduledExam: (id: string) => apiClient.delete(`/admin/scheduled-exams/${id}`).then((r) => r.data),
  importScheduledExams: (scheduleId: string, file: File, replace = false) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient
      .post<{ created: number; staffCreated: number; total: number }>(
        `/admin/exam-schedules/${scheduleId}/import`,
        fd,
        { params: { replace } },
      )
      .then((r) => r.data);
  },

  // Exam staff directory
  listExamStaff: (role?: string) =>
    apiClient.get<AdminExamStaff[]>('/admin/exam-staff', { params: role ? { role } : {} }).then((r) => r.data),
  createExamStaff: (data: { name: string; role: ExamStaffRole; phone?: string; email?: string; note?: string; active?: boolean }) =>
    apiClient.post<AdminExamStaff>('/admin/exam-staff', data).then((r) => r.data),
  updateExamStaff: (id: string, data: Partial<{ name: string; role: ExamStaffRole; phone: string; email: string; note: string; active: boolean }>) =>
    apiClient.patch<AdminExamStaff>(`/admin/exam-staff/${id}`, data).then((r) => r.data),
  deleteExamStaff: (id: string) => apiClient.delete(`/admin/exam-staff/${id}`).then((r) => r.data),

  // Students
  listStudents: (params: { search?: string; take?: number; skip?: number; batchNumber?: string; intake?: string }) =>
    apiClient.get<{ items: AdminStudent[]; total: number }>('/admin/students', { params }).then((r) => r.data),
  createStudent: (data: Partial<AdminStudent> & { registrationNumber: string; nic: string; fullName: string }) =>
    apiClient.post<AdminStudent>('/admin/students', data).then((r) => r.data),
  updateStudent: (id: string, data: Partial<AdminStudent>) =>
    apiClient.patch<AdminStudent>(`/admin/students/${id}`, data).then((r) => r.data),
  deleteStudent: (id: string) => apiClient.delete(`/admin/students/${id}`).then((r) => r.data),
  importStudents: (file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<ImportResult>(`/admin/students/import?dryRun=${dryRun}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      })
      .then((r) => r.data);
  },
};
