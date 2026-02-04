import { apiRequest } from './client';
import type { ScreenerResponse, MetadataResponse, SetParamsResponse } from './types';

export async function fetchScreenerData(): Promise<ScreenerResponse> {
  return apiRequest<ScreenerResponse>('screener');
}

export async function fetchMetadata(): Promise<MetadataResponse> {
  return apiRequest<MetadataResponse>('metadata');
}

export async function setParams(params: {
  expiry?: string;
  ror?: number;
}): Promise<SetParamsResponse> {
  return apiRequest<SetParamsResponse>('setParams', {
    method: 'POST',
    body: params,
  });
}

export async function triggerRefresh(): Promise<string> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}?action=refresh&password=${import.meta.env.VITE_API_PASSWORD || ''}`
  );
  return response.text();
}
