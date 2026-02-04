import { apiRequest } from './client';
import type { MonitorResponse } from './types';

export async function fetchMonitorData(): Promise<MonitorResponse> {
  return apiRequest<MonitorResponse>('monitor');
}
