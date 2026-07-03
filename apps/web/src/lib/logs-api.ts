import apiClient from './api-client';

export interface ActionLog {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  method: string;
  route: string;
  entity: string | null;
  entity_id: string | null;
  entity_ref: string | null;
  status_code: number | null;
  success: boolean;
  message: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
}

export interface LogPage {
  items: ActionLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LogFilters {
  entityId?: string;
  serial?: string;
  userId?: string;
  action?: string;
  method?: string;
  success?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const logsApi = {
  list: (f: LogFilters = {}) => {
    const p: Record<string, string> = {};
    if (f.entityId) p.entityId = f.entityId;
    if (f.serial) p.serial = f.serial;
    if (f.userId) p.userId = f.userId;
    if (f.action) p.action = f.action;
    if (f.method) p.method = f.method;
    if (typeof f.success === 'boolean') p.success = String(f.success);
    if (f.search) p.search = f.search;
    if (f.dateFrom) p.dateFrom = f.dateFrom;
    if (f.dateTo) p.dateTo = f.dateTo;
    if (f.page) p.page = String(f.page);
    if (f.pageSize) p.pageSize = String(f.pageSize);
    return apiClient.get<LogPage>('/logs', { params: p }).then((r) => r.data);
  },

  actions: () => apiClient.get<string[]>('/logs/actions').then((r) => r.data),
};
