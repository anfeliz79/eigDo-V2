const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type FetchOptions = RequestInit & { token?: string };

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('eigdo_token');
  }

  private async request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    const authToken = token || this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
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
      throw new Error(body.message || body.error || `HTTP ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, fullName: string) {
    return this.request<{ token: string; refreshToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
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
    return this.request<FiscalSettings>('/fiscal-settings');
  }

  async saveFiscalSettings(data: Partial<FiscalSettings>) {
    return this.request<FiscalSettings>('/fiscal-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Customer Mappings
  async getCustomerMappings() {
    return this.request<CustomerMapping[]>('/customer-mappings');
  }

  async saveCustomerMapping(data: Partial<CustomerMapping>) {
    return this.request<CustomerMapping>('/customer-mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Vendor Mappings
  async getVendorMappings() {
    return this.request<VendorMapping[]>('/vendor-mappings');
  }

  async saveVendorMapping(data: Partial<VendorMapping>) {
    return this.request<VendorMapping>('/vendor-mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Tax Mappings
  async getTaxMappings() {
    return this.request<TaxMapping[]>('/tax-mappings');
  }

  async saveTaxMapping(data: Partial<TaxMapping>) {
    return this.request<TaxMapping>('/tax-mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Item Overrides
  async getItemOverrides() {
    return this.request<ItemOverride[]>('/item-overrides');
  }

  async saveItemOverride(data: Partial<ItemOverride>) {
    return this.request<ItemOverride>('/item-overrides', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // QBO
  async getQboAuthUrl() {
    return this.request<{ url: string }>('/qbo/auth-url');
  }

  async getQboStatus() {
    return this.request<{ connected: boolean; realmId?: string; lastSync?: string }>('/qbo/status');
  }

  async disconnectQbo() {
    return this.request('/qbo/disconnect', { method: 'POST' });
  }

  // Documents
  async getDocuments(page = 1, pageSize = 20) {
    return this.request<PaginatedResult<EcfDocument>>(`/documents?page=${page}&pageSize=${pageSize}`);
  }
}

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface OnboardingStatus {
  currentStep: string;
  completedSteps: string[];
  isComplete: boolean;
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

export interface CustomerMapping {
  id: string;
  qboCustomerId: string;
  qboDisplayName: string;
  rnc?: string;
  razonSocialDgii?: string;
  tipoComprobante: string;
  excluido: boolean;
}

export interface VendorMapping {
  id: string;
  qboVendorId: string;
  qboDisplayName: string;
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

export const api = new ApiClient(API_BASE);
