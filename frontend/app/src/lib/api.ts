const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5102/api';

type FetchOptions = RequestInit & { token?: string };

// Backend wraps all responses in ApiResponse<T>
interface ApiResponseWrapper<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('eigdo_token');
  }

  private getCompanyId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('eigdo_company');
  }

  private async request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    const authToken = token || this.getToken();

    const isFormData = fetchOptions.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const companyId = this.getCompanyId();
    if (companyId) {
      headers['X-Company-Id'] = companyId;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('eigdo_token');
        localStorage.removeItem('eigdo_user');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Handle ApiResponse error format
      if (body.error) throw new Error(body.error);
      if (body.errors) {
        const firstError = Object.values(body.errors).flat()[0];
        throw new Error(firstError as string || `HTTP ${res.status}`);
      }
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
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: RegisterData) {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getMe() {
    return this.request<{ userId: string; email: string }>('/auth/me');
  }

  // Onboarding
  async getOnboardingStatus() {
    return this.request<OnboardingStatus>('/onboarding/status');
  }

  async advanceOnboarding(step: string) {
    return this.request<OnboardingStatus>('/onboarding/advance', {
      method: 'POST',
      body: JSON.stringify({ step }),
    });
  }

  // Fiscal Settings
  async getFiscalSettings() {
    return this.request<FiscalSettings>('/FiscalSettings');
  }

  async saveFiscalSettings(data: Partial<FiscalSettings>) {
    return this.request<FiscalSettings>('/FiscalSettings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadCertificate(file: File, password: string) {
    const formData = new FormData();
    formData.append('certificate', file);
    formData.append('password', password);
    return this.request<CertificateInfo>('/FiscalSettings/certificate', {
      method: 'POST',
      body: formData,
    });
  }

  async getCertificateStatus() {
    return this.request<CertificateInfo>('/FiscalSettings/certificate');
  }

  // Customer Mappings
  async getCustomerMappings() {
    return this.request<CustomerMapping[]>('/CustomerMappings');
  }

  async saveCustomerMapping(data: Partial<CustomerMapping>) {
    const method = data.id ? 'PUT' : 'POST';
    const path = data.id ? `/CustomerMappings/${data.id}` : '/CustomerMappings';
    return this.request<CustomerMapping>(path, {
      method,
      body: JSON.stringify(data),
    });
  }

  async deleteCustomerMapping(id: string) {
    return this.request(`/CustomerMappings/${id}`, { method: 'DELETE' });
  }

  // Vendor Mappings
  async getVendorMappings() {
    return this.request<VendorMapping[]>('/VendorMappings');
  }

  async saveVendorMapping(data: Partial<VendorMapping>) {
    const method = data.id ? 'PUT' : 'POST';
    const path = data.id ? `/VendorMappings/${data.id}` : '/VendorMappings';
    return this.request<VendorMapping>(path, {
      method,
      body: JSON.stringify(data),
    });
  }

  async deleteVendorMapping(id: string) {
    return this.request(`/VendorMappings/${id}`, { method: 'DELETE' });
  }

  // Tax Mappings
  async getTaxMappings() {
    return this.request<TaxMapping[]>('/TaxMappings');
  }

  async saveTaxMapping(data: Partial<TaxMapping>) {
    const method = data.id ? 'PUT' : 'POST';
    const path = data.id ? `/TaxMappings/${data.id}` : '/TaxMappings';
    return this.request<TaxMapping>(path, {
      method,
      body: JSON.stringify(data),
    });
  }

  async deleteTaxMapping(id: string) {
    return this.request(`/TaxMappings/${id}`, { method: 'DELETE' });
  }

  // Item Overrides
  async getItemOverrides() {
    return this.request<ItemOverride[]>('/ItemOverrides');
  }

  async saveItemOverride(data: Partial<ItemOverride>) {
    const method = data.id ? 'PUT' : 'POST';
    const path = data.id ? `/ItemOverrides/${data.id}` : '/ItemOverrides';
    return this.request<ItemOverride>(path, {
      method,
      body: JSON.stringify(data),
    });
  }

  async deleteItemOverride(id: string) {
    return this.request(`/ItemOverrides/${id}`, { method: 'DELETE' });
  }

  // QBO Sample & Field Mappings
  async getQboSample(entityType: string, skip?: number) {
    const skipParam = skip !== undefined ? `?skip=${skip}` : '';
    return this.request<QboSampleRecord>(`/qbo/sample/${encodeURIComponent(entityType.toLowerCase())}${skipParam}`);
  }

  async getFieldMappings(entityType: string) {
    return this.request<FieldMappingDto[]>(`/FieldMappings/${encodeURIComponent(entityType)}`);
  }

  async saveFieldMappings(entityType: string, mappings: FieldMappingDto[]) {
    return this.request<void>(`/FieldMappings/${encodeURIComponent(entityType)}`, {
      method: 'PUT',
      body: JSON.stringify({ mappings }),
    });
  }

  // QBO
  async getQboAuthUrl() {
    return this.request<{ authUrl: string }>('/qbo/auth-url');
  }

  async getQboStatus() {
    return this.request<{ connected: boolean; realmId?: string; lastSync?: string }>('/qbo/status');
  }

  async getQboCompanyInfo() {
    return this.request<QboCompanyInfo>('/qbo/company-info');
  }

  // DGII
  async lookupRnc(rnc: string) {
    return this.request<DgiiRncResult>(`/Dgii/rnc/${encodeURIComponent(rnc)}`);
  }

  async getCertificationAssistance() {
    return this.request<CertificationAssistanceConfig>('/Dgii/certification-assistance');
  }

  async resolveRnc(name: string, maskedTaxId?: string) {
    return this.request<ResolveRncResponse>('/Dgii/resolve-rnc', {
      method: 'POST',
      body: JSON.stringify({ name, maskedTaxId }),
    });
  }

  async disconnectQbo() {
    return this.request('/qbo/disconnect', { method: 'POST' });
  }

  async syncQbo() {
    return this.request<{ message: string; customersAdded: number; vendorsAdded: number; taxCodesAdded: number; itemsAdded: number; partial?: boolean }>('/qbo/sync', { method: 'POST' });
  }

  // Documents
  async getDocuments(page = 1, pageSize = 20) {
    return this.request<PaginatedResult<EcfDocument>>(`/documents?page=${page}&pageSize=${pageSize}`);
  }

  async getDocumentDetail(id: string) {
    return this.request<EcfDocument>(`/documents/${id}`);
  }

  async getDocumentStats() {
    return this.request<DocumentStats>('/documents/stats');
  }

  // Billing
  async getPlans() {
    return this.request<PlanDto[]>('/billing/plans');
  }

  async createCheckout(priceId: string, successUrl?: string, cancelUrl?: string) {
    return this.request<CheckoutSessionResult>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId, successUrl, cancelUrl }),
    });
  }

  async confirmCheckout(sessionId: string) {
    return this.request<string>('/billing/confirm-checkout', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async getSubscription() {
    return this.request<SubscriptionInfo | null>('/billing/subscription');
  }

  async canEmit() {
    return this.request<{ canEmit: boolean; reason?: string }>('/billing/can-emit');
  }

  async getPayments(limit = 20) {
    return this.request<PaymentHistory[]>(`/billing/payments?limit=${limit}`);
  }

  async createBillingPortal() {
    return this.request<{ url: string }>('/billing/portal', { method: 'POST' });
  }

  // Emission
  async previewEmission(data: EmissionRequest) {
    return this.request<EmissionResult>('/emission/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async emitDocument(data: EmissionRequest) {
    return this.request<EmissionResult>('/emission/transform-and-queue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Support Tickets
  async getTickets() {
    return this.request<SupportTicketSummary[]>('/Support/tickets');
  }

  async createTicket(data: { subject: string; description: string; priority?: string }) {
    return this.request<{ ticketId: string }>('/Support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTicketDetail(id: string) {
    return this.request<SupportTicketDetail>(`/Support/tickets/${id}`);
  }

  async replyToTicket(id: string, message: string) {
    return this.request<{ messageId: string }>(`/Support/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Sequences
  async getSequences() {
    return this.request<SequenceDto[]>('/Sequences');
  }

  async createSequence(data: Partial<SequenceDto>) {
    return this.request<SequenceDto>('/Sequences', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSequence(id: string, data: Partial<SequenceDto>) {
    return this.request<SequenceDto>(`/Sequences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSequence(id: string) {
    return this.request(`/Sequences/${id}`, { method: 'DELETE' });
  }

  // Companies
  async getMyCompanies() {
    return this.request<CompanyInfo[]>('/companies');
  }

  async createCompany(name: string) {
    return this.request<CompanyInfo>('/companies', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }
}

// Types matching backend DTOs exactly

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  companies?: CompanyUser[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companies: CompanyUser[];
}

export interface CompanyUser {
  companyId: string;
  companyName: string;
  role: string;
}

export interface OnboardingStatus {
  currentStep: string;
  completionPercentage: number;
  missingItems: Record<string, string[]>;
}

export interface ResolveRncResponse {
  resolved: boolean;
  resolvedRnc?: string;
  resolvedRazonSocial?: string;
  candidates: DgiiRncResult[];
}

export interface DgiiRncResult {
  rnc: string;
  razonSocial: string;
  nombreComercial: string;
  estado: string;
  regimenPagos: string;
  actividadEconomica: string;
  administracionLocal: string;
  esFacturadorElectronico: boolean;
  esActivo: boolean;
}

export interface QboCompanyInfo {
  // Identity
  companyName?: string;
  legalName?: string;
  ein?: string;
  // Contact
  phone?: string;
  email?: string;
  website?: string;
  // Company Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  countrySubDivisionCode?: string;
  postalCode?: string;
  country?: string;
  fullAddress?: string;
  // Legal Address
  legalAddressLine1?: string;
  legalCity?: string;
  legalCountrySubDivisionCode?: string;
  legalPostalCode?: string;
  legalCountry?: string;
  legalFullAddress?: string;
  // Fiscal
  fiscalYearStartMonth?: string;
  companyStartDate?: string;
}

export interface FiscalSettings {
  rnc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  defaultIncomeType?: number;
  defaultUnitMeasure?: number;
  defaultGoodServiceIndicator?: number;
  defaultNoTaxCodeBillingIndicator?: number;
}

export interface CertificateInfo {
  configured: boolean;
  subject?: string;
  issuer?: string;
  expiresUtc?: string;
  daysUntilExpiry?: number;
}

export interface CustomerMapping {
  id: string;
  qboCustomerId: string;
  qboDisplayName: string;
  qboTaxId?: string;
  rnc?: string;
  razonSocialDgii?: string;
  tipoComprobante: string;
  excluido: boolean;
}

export interface VendorMapping {
  id: string;
  qboVendorId: string;
  qboDisplayName: string;
  qboTaxId?: string;
  rnc?: string;
  razonSocialDgii?: string;
  tipoComprobante: string;
  retentionItbisRate?: number;
  retentionIsrRate?: number;
  excluido: boolean;
}

export interface TaxMapping {
  id: string;
  qboTaxCodeId: string;
  qboTaxCodeName: string;
  qboTaxRate?: number;
  billingIndicator: number;
}

export interface ItemOverride {
  id: string;
  qboItemId: string;
  qboItemName: string;
  unitMeasureOverride?: number;
  goodServiceIndicatorOverride?: number;
}

export interface EcfDocument {
  id: string;
  ecfType: string;
  status: string;
  encf?: string;
  qboDocNumber?: string;
  buyerRnc?: string;
  buyerName?: string;
  totalAmount: number;
  taxAmount: number;
  errorMessage?: string;
  createdAtUtc: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DocumentStats {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  todayCount: number;
}

export interface EmissionRequest {
  qboSourceId: string;
  qboSourceType: string;
  ecfType: string;
}

export interface EmissionResult {
  documentId: string;
  encf?: string;
  status: string;
  message?: string;
}

// Billing types
export interface PlanDto {
  id: string;
  name: string;
  description?: string;
  includedDocumentsPerMonth: number;
  sortOrder: number;
  prices: PriceDto[];
}

export interface PriceDto {
  id: string;
  amount: number;
  currency: string;
  interval: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface SubscriptionInfo {
  id: string;
  planName: string;
  status: string;
  startDateUtc: string;
  endDateUtc?: string;
  currentPeriodStartUtc: string;
  currentPeriodEndUtc: string;
  documentsEmittedThisPeriod: number;
  includedDocumentsPerMonth: number;
  gateway: string;
  priceAmount: number;
  priceInterval: string;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  createdAtUtc: string;
}

export interface CertificationAssistanceConfig {
  id?: string;
  isEnabled: boolean;
  price: number;
  currency: string;
  title: string;
  description: string;
  includedItems: string[];
  requirements: string[];
  chargeOnNextBillingCycle: boolean;
  estimatedDays: number;
}

// Support Ticket types
export interface SupportTicketSummary {
  id: string;
  subject: string;
  status: string;
  priority: string;
  messageCount: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

export interface SupportTicketListResponse {
  items: SupportTicketSummary[];
  total: number;
}

export interface SupportTicketMessage {
  id: string;
  message: string;
  isStaffReply: boolean;
  senderName?: string;
  senderEmail?: string;
  createdAtUtc: string;
}

export interface SupportTicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  contactEmail?: string;
  contactName?: string;
  companyName?: string;
  userName?: string;
  userEmail?: string;
  createdAtUtc: string;
  messages: SupportTicketMessage[];
}

export interface CompanyInfo {
  id: string;
  name: string;
  rnc?: string;
  role: string;
  isOnboardingComplete: boolean;
  subscriptionStatus?: string;
  planName?: string;
  hasQboConnection: boolean;
}

export interface SequenceDto {
  id: string;
  ecfType: string;
  ecfTypeLabel: string;
  rangeStart: number;
  rangeEnd: number;
  currentValue: number;
  dueDateUtc: string;
  isActive: boolean;
  alertThreshold: number;
  remainingCount: number;
  isExhausted: boolean;
  isExpired: boolean;
  percentUsed: number;
}

export interface QboSampleRecord {
  id: string;
  displayName: string;
  fields: Record<string, string>;
}

export interface FieldMappingDto {
  targetField: string;
  sourceType: 'QboField' | 'Fixed';
  qboFieldPath?: string;
  fixedValue?: string;
}

export const api = new ApiClient(API_BASE);
