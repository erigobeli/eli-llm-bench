import { Client, Deal, PaginatedResponse, DashboardMetrics } from './types';

const API_BASE = '/api';

export const api = {
  async getClients(page: number = 1, pageSize: number = 10, search: string = ''): Promise<PaginatedResponse<Client>> {
    const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/clients?${params}`);
    if (!res.ok) throw new Error('Failed to fetch clients');
    return res.json();
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create client');
    }
    return res.json();
  },

  async updateClient(id: number, data: Partial<Client>): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update client');
    }
    return res.json();
  },

  async deleteClient(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete client');
    }
  },

  async getDeals(page: number = 1, pageSize: number = 10, filters?: { search?: string; stage?: string; clientId?: number }): Promise<PaginatedResponse<Deal>> {
    const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
    if (filters?.search) params.append('search', filters.search);
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.clientId) params.append('clientId', filters.clientId.toString());
    const res = await fetch(`${API_BASE}/deals?${params}`);
    if (!res.ok) throw new Error('Failed to fetch deals');
    return res.json();
  },

  async createDeal(data: Partial<Deal>): Promise<Deal> {
    const res = await fetch(`${API_BASE}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create deal');
    }
    return res.json();
  },

  async updateDeal(id: number, data: Partial<Deal>): Promise<Deal> {
    const res = await fetch(`${API_BASE}/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update deal');
    }
    return res.json();
  },

  async deleteDeal(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/deals/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete deal');
    }
  },

  async getDashboard(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    return res.json();
  }
};
