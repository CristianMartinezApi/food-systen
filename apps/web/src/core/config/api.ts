import { getTenantSlug } from '../../shared/utils/tenant';

const API_URL = 'http://localhost:3001/api';

const getHeaders = (headers: Record<string, string> = {}) => {
  const token = localStorage.getItem('@FoodSystem:token');
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-slug': getTenantSlug(),
    ...headers
  };

  if (token) {
    baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  return baseHeaders;
};

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },
  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },
  patch: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },
  delete: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Network response was not ok');
    if (response.status === 204) return null;
    return response.json();
  }
};
