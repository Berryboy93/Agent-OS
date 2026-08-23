/**
 * Centralized API client for Command Center backend
 * Single source of truth for all API communication
 */

const BASE_URL = '/api/command-center';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    // Handle streaming responses
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return response as any;
    }

    try {
      return await response.json();
    } catch {
      return {} as T;
    }
  }

  // Health & Status
  async health() {
    return this.request('/health');
  }

  // Runs Management
  async listRuns(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return this.request(query ? `/runs?${query}` : '/runs');
  }

  async getRun(runId: string) {
    return this.request(`/runs/${runId}`);
  }

  async createRun(agent: string) {
    return this.request('/runs', {
      method: 'POST',
      body: JSON.stringify({ agent }),
    });
  }

  async updateRunStatus(runId: string, status: string) {
    return this.request(`/runs/${runId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Commands
  async dispatchCommand(runId: string, command: string, args?: Record<string, any>) {
    return this.request('/commands/dispatch', {
      method: 'POST',
      body: JSON.stringify({ runId, command, args: args || {} }),
    });
  }

  // Events
  async streamEvents() {
    const response = await fetch(`${this.baseUrl}/events/stream`);
    return response;
  }

  // RBAC
  async getRoles() {
    return this.request('/rbac/roles');
  }

  async getPolicies() {
    return this.request('/rbac/policies');
  }
}

export const apiClient = new ApiClient();
