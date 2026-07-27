import { getTenantSlug } from '../../shared/utils/tenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT_MS = 12000;

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

const fetchWithTimeout = async (input: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('A loja demorou demais para responder. Tente novamente em instantes.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const fetchReadableWithRetry = async (input: string, init?: RequestInit) => {
  try {
    return await fetchWithTimeout(input, init);
  } catch (error) {
    const isTransientNetworkFailure = error instanceof TypeError && navigator.onLine;
    if (!isTransientNetworkFailure) throw error;

    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return fetchWithTimeout(input, init);
  }
};

// Redireciona para login e limpa sessão quando token expira
const handleUnauthorized = () => {
  localStorage.removeItem('@FoodSystem:token');
  localStorage.removeItem('@FoodSystem:user');
  localStorage.removeItem('@FoodSystem:restaurant');
  localStorage.removeItem('tenant_slug');
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login';
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

  if (response.status === 403) {
    const message = await parseErrorMessage(response, 'Acesso negado.');

    if (message.includes('You do not belong to this restaurant')) {
      handleUnauthorized();
      throw new Error('Sua sessão está vinculada a outra loja. Faça login novamente.');
    }

    throw new Error(message);
  }

  // Para outros erros, preservar campos extras da resposta (ex: openOrdersCount, requiresForce)
  const errorData = await response.json().catch(() => ({}));
  const err = new Error(errorData.error || 'Erro na requisição') as any;
  Object.assign(err, errorData);
  throw err;
};

export const api = {
  get: async (endpoint: string) => {
    const response = await fetchReadableWithRetry(`${API_URL}${endpoint}`, {
      headers: getHeaders()
    });
    if (!response.ok) await handleError(response, endpoint);
    return response.json();
  },
  post: async (endpoint: string, data: any) => {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) await handleError(response, endpoint);
    return response.json();
  },
  put: async (endpoint: string, data: any) => {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) await handleError(response, endpoint);
    return response.json();
  },
  patch: async (endpoint: string, data: any) => {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) await handleError(response, endpoint);
    return response.json();
  },
  delete: async (endpoint: string) => {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) await handleError(response, endpoint);
    if (response.status === 204) return null;
    return response.json();
  }
};
