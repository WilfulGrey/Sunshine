export type ContactType = 'successfully' | 'not_successfully' | 'note_only';

export interface SunshineCallback {
  caregiver_id: number;
  callback_at: string;
  employee_id: number | null;
  first_name: string;
  last_name: string;
  phone_number: string;
  latest_contact_content: string | null;
  callback_source: string;
  recruiter_name: string | null;
}

export interface SunshineCallbacksResponse {
  data: SunshineCallback[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

export interface SunshineLog {
  id: number;
  created_at: string;
  data: unknown;
  title: string;
  content: string;
  custom_author_name: string | null;
  logable_type: string | null;
  logable_id: number | null;
  job_offer_id: number | null;
  author: {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
  };
  updated_at: string;
}

export interface SunshineLogsResponse {
  data: SunshineLog[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

class SunshineService {
  private baseUrl: string;
  private token: string;

  constructor() {
    // Always use relative URLs - proxy handles routing:
    // Dev: Vite proxy (vite.config.ts)
    // Prod: Render rewrite rules
    this.baseUrl = '';
    this.token = import.meta.env.VITE_SUNSHINE_TOKEN || '';

    if (!this.token) {
      console.warn('VITE_SUNSHINE_TOKEN is not configured');
    }
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Sunshine-Token': this.token,
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Sunshine API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  async getCallbacks(page = 1, perPage = 100): Promise<SunshineCallbacksResponse> {
    return this.request<SunshineCallbacksResponse>(
      `/api/sunshine/callbacks?page=${page}&per_page=${perPage}`
    );
  }

  async recordContact(caregiverId: number, type: ContactType, message: string): Promise<unknown> {
    return this.request(`/api/sunshine/caregivers/${caregiverId}/contact`, {
      method: 'POST',
      body: JSON.stringify({ type, message }),
    });
  }

  async setCallback(caregiverId: number, callbackAt: string | null): Promise<unknown> {
    return this.request(`/api/sunshine/caregivers/${caregiverId}/callback`, {
      method: 'POST',
      body: JSON.stringify({ callback_at: callbackAt }),
    });
  }

  async assignEmployee(caregiverId: number, employeeId: number): Promise<unknown> {
    return this.request(`/api/sunshine/caregivers/${caregiverId}/employee`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    });
  }

  async unassignEmployee(caregiverId: number): Promise<unknown> {
    return this.request(`/api/sunshine/caregivers/${caregiverId}/employee`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: null }),
    });
  }

  async setAvailability(caregiverId: number, availableFrom: string, availableTo?: string): Promise<unknown> {
    const body: Record<string, string> = { available_from: availableFrom };
    if (availableTo) {
      body.available_to = availableTo;
    }
    return this.request(`/api/sunshine/caregivers/${caregiverId}/availability`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getLogs(caregiverId: number, page = 1, perPage = 10): Promise<SunshineLogsResponse> {
    return this.request<SunshineLogsResponse>(
      `/api/sunshine/caregivers/${caregiverId}/logs?page=${page}&per_page=${perPage}`
    );
  }

  async getLatestLog(caregiverId: number): Promise<{ data: SunshineLog }> {
    return this.request<{ data: SunshineLog }>(
      `/api/sunshine/caregivers/${caregiverId}/logs/latest`
    );
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }
}

export const sunshineService = new SunshineService();
