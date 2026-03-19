const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class AdminApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('eigdo_admin_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eigdo_admin_token');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; user: { id: string; email: string; fullName: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Dashboard stats
  async getStats() {
    return this.request<AdminStats>('/admin/stats');
  }

  async getRecentCompanies(limit = 5) {
    return this.request<RecentCompany[]>(`/admin/recent-companies?limit=${limit}`);
  }

  async getRecentDocuments(limit = 10) {
    return this.request<RecentDocument[]>(`/admin/recent-documents?limit=${limit}`);
  }

  // Companies
  async getCompanies(page = 1, pageSize = 50, search?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    return this.request<PaginatedResult<AdminCompany>>(`/admin/companies?${params}`);
  }

  async getCompany(id: string) {
    return this.request<CompanyDetail>(`/admin/companies/${id}`);
  }

  async toggleCompanyActive(id: string) {
    return this.request<{ id: string; isActive: boolean }>(`/admin/companies/${id}/toggle-active`, { method: 'POST' });
  }

  // Subscriptions
  async getSubscriptions(page = 1, pageSize = 50) {
    return this.request<PaginatedResult<AdminSubscription>>(`/admin/subscriptions?page=${page}&pageSize=${pageSize}`);
  }

  // Audit logs
  async getAuditLogs(params: AuditLogParams = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.companyId) qs.set('companyId', params.companyId);
    if (params.action) qs.set('action', params.action);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    return this.request<PaginatedResult<AuditLogEntry>>(`/admin/audit-logs?${qs}`);
  }
}

// Types
export interface AdminStats {
  totalCompanies: number;
  activeCompanies: number;
  activeSubscriptions: number;
  ecfToday: number;
  ecfErrors: number;
  ecfTotal: number;
}

export interface RecentCompany {
  id: string;
  name: string;
  rnc?: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface RecentDocument {
  id: string;
  companyId: string;
  ecfType: string;
  status: string;
  encf?: string;
  totalAmount: number;
  errorMessage?: string;
  createdAtUtc: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  rnc?: string;
  isActive: boolean;
  onboardingStep: string;
  isOnboardingComplete: boolean;
  qboConnected: boolean;
  planName?: string;
  ecfCount: number;
  createdAtUtc: string;
}

export interface CompanyDetail extends AdminCompany {
  qboRealmId?: string;
  subscriptionStatus?: string;
  customerCount: number;
  vendorCount: number;
  fiscalRnc?: string;
  fiscalRazonSocial?: string;
}

export interface AdminSubscription {
  id: string;
  companyName: string;
  companyId: string;
  planName: string;
  status: string;
  startDateUtc: string;
  endDateUtc?: string;
  currentPeriodStartUtc: string;
  currentPeriodEndUtc: string;
  documentsEmittedThisPeriod: number;
  includedDocumentsPerMonth: number;
  gateway: string;
}

export interface AuditLogEntry {
  id: string;
  companyId?: string;
  companyName?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAtUtc: string;
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  companyId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const adminApi = new AdminApiClient(API_BASE);
