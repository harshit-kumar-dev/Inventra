const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  statusCode: number;
  errors?: any;

  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message: string; data?: T; meta?: any }> {
  const token = localStorage.getItem('stocksense_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `HTTP Error ${response.status}`;
      throw new ApiError(errorMessage, response.status, data?.errors);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error?.message || 'Network connection failed', 0);
  }
}

export const api = {
  get: <T = any>(endpoint: string, query?: Record<string, any>) => {
    let url = endpoint;
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return request<T>(url, { method: 'GET' });
  },

  post: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch: <T = any>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T = any>(endpoint: string) => {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};
