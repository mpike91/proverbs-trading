const API_URL = import.meta.env.VITE_API_URL || '';
const API_PASSWORD = import.meta.env.VITE_API_PASSWORD || '';

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
}

export async function apiRequest<T>(
  action: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body } = options;

  // Build URL with query parameters
  const url = new URL(API_URL);
  url.searchParams.set('action', action);

  if (API_PASSWORD) {
    url.searchParams.set('password', API_PASSWORD);
  }

  const fetchOptions: RequestInit = {
    method,
  };

  // Only set Content-Type for POST requests to avoid CORS preflight on GET
  if (method === 'POST' && body) {
    fetchOptions.headers = {
      'Content-Type': 'application/json',
    };
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), fetchOptions);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Check for API-level errors
  if (data.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export function getApiUrl(): string {
  return API_URL;
}

export function isApiConfigured(): boolean {
  return !!API_URL && API_URL !== '';
}
