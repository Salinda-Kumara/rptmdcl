import apiClient from './api-client';

export interface AnalyticsData {
  kpis: {
    totalApplications: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
    uniqueStudents: number;
    totalSubjects: number;
    verifiedRevenue: number;
    avgSubjectsPerApp: number;
  };
  byType: { type: string; count: number }[];
  byCategory: { category: string; count: number }[];
  topSubjects: { code: string; name: string; repeat: number; medical: number; firstAttempt: number; total: number }[];
  topBatches: { batch: string; count: number }[];
  topIntakes: { intake: string; count: number }[];
  funnel: { stage: string; count: number }[];
  submissionsOverTime: { date: string; count: number }[];
}

export const analyticsApi = {
  get: (params?: { dateFrom?: string; dateTo?: string }) => {
    const p: Record<string, string> = {};
    if (params?.dateFrom) p.dateFrom = params.dateFrom;
    if (params?.dateTo) p.dateTo = params.dateTo;
    return apiClient.get<AnalyticsData>('/applications/analytics', { params: p }).then((r) => r.data);
  },
};
