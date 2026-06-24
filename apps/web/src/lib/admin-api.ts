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

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  staffUser?: { name: string; position: string } | null;
  roles: { role: { id: string; name: string } }[];
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
  programmeId: string;
  description?: string;
}

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

  // Users
  listRoles: () => apiClient.get<Role[]>('/admin/roles').then((r) => r.data),
  listUsers: () => apiClient.get<AdminUser[]>('/admin/users').then((r) => r.data),
  createUser: (data: { email: string; password: string; name: string; position: string; roles: string[] }) =>
    apiClient.post<AdminUser>('/admin/users', data).then((r) => r.data),
  updateUser: (id: string, data: { name?: string; position?: string; password?: string; roles?: string[] }) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data),
  deactivateUser: (id: string) => apiClient.delete(`/admin/users/${id}`).then((r) => r.data),

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
  deleteBatch: (batchNumber: string, intake: string) =>
    apiClient.delete(`/admin/batches/${encodeURIComponent(batchNumber)}/${encodeURIComponent(intake)}`).then((r) => r.data),

  // Exam schedules
  listSchedules: () => apiClient.get<AdminSchedule[]>('/admin/exam-schedules').then((r) => r.data),
  createSchedule: (data: { name: string; startDate: string; endDate: string; programmeId: string; description?: string }) =>
    apiClient.post<AdminSchedule>('/admin/exam-schedules', data).then((r) => r.data),
  updateSchedule: (id: string, data: Partial<{ name: string; startDate: string; endDate: string; programmeId: string; description: string }>) =>
    apiClient.patch<AdminSchedule>(`/admin/exam-schedules/${id}`, data).then((r) => r.data),
  deleteSchedule: (id: string) => apiClient.delete(`/admin/exam-schedules/${id}`).then((r) => r.data),

  // Students
  listStudents: (params: { search?: string; take?: number; skip?: number }) =>
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

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  FINANCE_OFFICER: 'Finance Officer',
  VERIFICATION_OFFICER: 'Verification Officer',
  SCHEDULE_OFFICER: 'Schedule Officer',
  EXAM_MANAGER: 'Exam Manager',
  REGISTRAR: 'Registrar',
  DIRECTOR: 'Director',
  ADMIN: 'Master Admin',
  SUPER_ADMIN: 'Super Admin',
};
