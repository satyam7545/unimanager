import { useAuthStore } from '../features/auth/store/authStore';

export const API_HOST = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : `${window.location.protocol}//${window.location.hostname}:5000`;

export const BASE_URL = `${API_HOST}/api/v1`;

interface RequestOptions extends RequestInit {
  bodyData?: any;
}

export class APIError extends Error {
  status: number;
  errors?: any[];

  constructor(message: string, status: number, errors?: any[]) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = 'APIError';
  }
}

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const { clearAuth, setAuth } = useAuthStore.getState();
  
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Refresh session failed');
    }

    const data = await res.json();
    const { user, accessToken } = data.data;

    setAuth(user, accessToken);
    return accessToken;
  } catch (error) {
    clearAuth();
    throw error;
  }
};

export const api = async (endpoint: string, options: RequestOptions = {}): Promise<any> => {
  const { accessToken } = useAuthStore.getState();
  const url = `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  
  // Set JSON or FormData body appropriately
  if (options.bodyData) {
    if (options.bodyData instanceof FormData) {
      options.body = options.bodyData;
      headers.delete('Content-Type');
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
      options.body = JSON.stringify(options.bodyData);
    }
  }

  // Set Authorization Header
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Include credentials for HttpOnly refresh cookie transfers
  options.credentials = 'include';
  options.headers = headers;

  try {
    let response = await fetch(url, options);

    // If unauthorized, attempt token refresh rotation
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      try {
        // Concurrency Lock: Reuse refresh promise if already fetching
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        
        const newAccessToken = await refreshPromise;
        
        // Replay request with updated token
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
        options.headers = retryHeaders;
        
        response = await fetch(url, options);
      } catch (refreshErr) {
        // If refresh fails, bubble up 401 error
        throw new APIError('Session expired. Please log in again.', 401);
      }
    }

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Fallback for non-JSON errors
      }

      throw new APIError(
        errorData.message || 'Something went wrong',
        response.status,
        errorData.errors
      );
    }

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error instanceof Error ? error.message : 'Network connection failure', 0);
  }
};

// Convenience methods
api.get = (endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
  api(endpoint, { ...options, method: 'GET' });

api.post = (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'bodyData'>) =>
  api(endpoint, { ...options, method: 'POST', bodyData: body });

api.put = (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'bodyData'>) =>
  api(endpoint, { ...options, method: 'PUT', bodyData: body });

api.patch = (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'bodyData'>) =>
  api(endpoint, { ...options, method: 'PATCH', bodyData: body });

api.delete = (endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
  api(endpoint, { ...options, method: 'DELETE' });

