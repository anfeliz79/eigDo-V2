const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5102/api';

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
      if (body.error) throw new Error(body.error);
      throw new Error(body.message || `HTTP ${res.status}`);
    }

    if (res.status === 204) return {} as T;

    const body = await res.json();

    // Unwrap ApiResponse<T> wrapper if present
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      if (!body.success) {
        throw new Error(body.error || 'Request failed');
      }
      return body.data as T;
    }

    return body as T;
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      user: { id: string; email: string; firstName: string; lastName: string; companies: { companyId: string; companyName: string; role: string }[] };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Profile
  async getProfile() {
    return this.request<ProfileResponse>('/auth/profile');
  }

  async updateProfile(data: UpdateProfileRequest) {
    return this.request<{ message: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: ChangePasswordRequest) {
    return this.request<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
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

  // Plans CRUD
  async getPlans() {
    return this.request<AdminPlan[]>('/admin/plans');
  }

  async createPlan(data: CreatePlanData) {
    return this.request<{ id: string }>('/admin/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlan(id: string, data: UpdatePlanData) {
    return this.request<{ id: string }>(`/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlan(id: string) {
    return this.request<{ message: string }>(`/admin/plans/${id}`, { method: 'DELETE' });
  }

  // Prices CRUD
  async createPrice(planId: string, data: CreatePriceData) {
    return this.request<{ id: string }>(`/admin/plans/${planId}/prices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePrice(id: string, data: UpdatePriceData) {
    return this.request<{ id: string }>(`/admin/prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePrice(id: string) {
    return this.request<{ message: string }>(`/admin/prices/${id}`, { method: 'DELETE' });
  }

  // Subscriptions
  async getSubscriptions(page = 1, pageSize = 50) {
    return this.request<PaginatedResult<AdminSubscription>>(`/admin/subscriptions?page=${page}&pageSize=${pageSize}`);
  }

  // Support Tickets
  async getTickets(params: TicketParams = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.status) qs.set('status', params.status);
    if (params.priority) qs.set('priority', params.priority);
    if (params.companyId) qs.set('companyId', params.companyId);
    return this.request<PaginatedResult<AdminTicket>>(`/admin/tickets?${qs}`);
  }

  async getTicketDetail(id: string) {
    return this.request<TicketDetail>(`/admin/tickets/${id}`);
  }

  async replyToTicket(id: string, message: string) {
    return this.request<{ messageId: string }>(`/admin/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async updateTicketStatus(id: string, status: string, priority?: string) {
    return this.request<{ id: string; status: string; priority: string }>(`/admin/tickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, priority }),
    });
  }

  // Alanube Config
  async getAlanubeConfig(companyId: string) {
    return this.request<AlanubeConfig>(`/admin/companies/${companyId}/alanube-config`);
  }

  async updateAlanubeConfig(companyId: string, data: { apiKey?: string; environment?: string }) {
    return this.request<{ message: string }>(`/admin/companies/${companyId}/alanube-config`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Payment Gateways
  async getPaymentGateways() {
    return this.request<{ gateways: PaymentGateway[] }>('/admin/payment-gateways');
  }

  // QBO App Config
  async getQboConfig() {
    return this.request<QboAppConfig>('/admin/qbo-config');
  }

  async updateQboConfig(data: QboAppConfigUpdate) {
    return this.request<{ message: string }>('/admin/qbo-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Platform Alanube Config
  async getPlatformAlanubeConfig() {
    return this.request<PlatformAlanubeConfig>('/admin/alanube-config');
  }

  async updatePlatformAlanubeConfig(data: Partial<PlatformAlanubeConfig>) {
    return this.request<{ message: string }>('/admin/alanube-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Admin Users
  async getAdminUsers() {
    return this.request<AdminUser[]>('/admin/users');
  }

  async createAdminUser(data: CreateAdminUserData) {
    return this.request<{ id: string }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUser(id: string, data: UpdateAdminUserData) {
    return this.request<{ id: string }>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminUser(id: string) {
    return this.request<{ message: string }>(`/admin/users/${id}`, { method: 'DELETE' });
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
  openTickets: number;
  totalUsers: number;
  monthlyRevenue: number;
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

export interface AdminPlan {
  id: string;
  name: string;
  description?: string;
  maxCompanies: number;
  includedDocumentsPerMonth: number;
  isActive: boolean;
  sortOrder: number;
  createdAtUtc: string;
  prices: AdminPrice[];
  subscriberCount: number;
}

export interface AdminPrice {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  isActive: boolean;
  stripeId?: string;
}

export interface CreatePlanData {
  name: string;
  description?: string;
  maxCompanies: number;
  includedDocumentsPerMonth: number;
  sortOrder: number;
}

export interface UpdatePlanData extends CreatePlanData {
  isActive: boolean;
}

export interface CreatePriceData {
  amount: number;
  currency?: string;
  interval: string;
}

export interface UpdatePriceData extends CreatePriceData {
  isActive: boolean;
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

export interface AdminTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  contactEmail?: string;
  contactName?: string;
  companyId?: string;
  userId?: string;
  companyName?: string;
  userEmail?: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
  messageCount: number;
}

export interface TicketMessage {
  id: string;
  message: string;
  isStaffReply: boolean;
  senderName?: string;
  senderEmail?: string;
  userId?: string;
  createdAtUtc: string;
}

export interface TicketDetail {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  contactEmail?: string;
  contactName?: string;
  companyId?: string;
  companyName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
  messages: TicketMessage[];
}

export interface TicketParams {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  companyId?: string;
}

export interface AlanubeConfig {
  configured: boolean;
  environment: string;
  apiKey?: string;
  companyId?: string;
}

export interface PaymentGateway {
  name: string;
  configured: boolean;
  webhookConfigured: boolean;
  status: string;
  totalPayments: number;
  description: string;
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

export interface QboAppConfig {
  QBO_CLIENT_ID?: string | null;
  QBO_CLIENT_SECRET?: string | null;
  QBO_REDIRECT_URI?: string | null;
  QBO_ENVIRONMENT?: string | null;
  QBO_WEBHOOK_VERIFIER_TOKEN?: string | null;
  QBO_SCOPE?: string | null;
}

export interface QboAppConfigUpdate {
  QBO_CLIENT_ID?: string | null;
  QBO_CLIENT_SECRET?: string | null;
  QBO_REDIRECT_URI?: string | null;
  QBO_ENVIRONMENT?: string | null;
  QBO_WEBHOOK_VERIFIER_TOKEN?: string | null;
  QBO_SCOPE?: string | null;
}

export interface PlatformAlanubeConfig {
  baseUrl: string;
  jwtToken: string; // masked in GET
  environment: string; // "Sandbox" or "Production"
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  systemRole: string;
  createdAtUtc: string;
  isActive: boolean;
}

export interface CreateAdminUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  systemRole: string;
}

export interface UpdateAdminUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  systemRole?: string;
  isActive?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProfileResponse {
  firstName: string;
  lastName: string;
  email: string;
  systemRole: string | null;
  createdAtUtc: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const adminApi = new AdminApiClient(API_BASE);
