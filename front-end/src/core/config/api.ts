import { getTenantSlug } from '../../shared/utils/tenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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

const parseErrorMessage = async (response: Response, fallback: string) => {
  const errorData = await response.json().catch(() => ({}));
  return errorData.error || fallback;
};

// Redireciona para login e limpa sessão quando token expira
const handleUnauthorized = () => {
  localStorage.removeItem('@FoodSystem:token');
  localStorage.removeItem('@FoodSystem:user');
  localStorage.removeItem('@FoodSystem:restaurant');
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/admin/login';
  }
};

const handleError = async (response: Response, endpoint: string) => {
  if (response.status === 401) {
    if (endpoint === '/auth/login') {
      throw new Error(await parseErrorMessage(response, 'Credenciais inválidas'));
    }

    handleUnauthorized();
    throw new Error(await parseErrorMessage(response, 'Sessão expirada. Faça login novamente.'));
  }

  throw new Error(await parseErrorMessage(response, 'Erro na requisição'));
};

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: getHeaders()
    });
    if (!response.ok) await handleError(response, endpoint);
    return response.json();
  },
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) await handleError(response, endpoint);
    return response.json();
  },
  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) await handleError(response, endpoint);
    return response.json();
  },
  patch: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) await handleError(response, endpoint);
    return response.json();
  },
  delete: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) await handleError(response, endpoint);
    if (response.status === 204) return null;
    return response.json();
  }
};
