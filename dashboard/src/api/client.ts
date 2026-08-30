import type { DailyProgress, RangeProgress, DashboardAnalysis, DashboardRange } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8081';
const TOKEN = import.meta.env.VITE_API_TOKEN ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Falha ao buscar ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getDaily: () => get<DailyProgress>('/api/dashboard/daily'),
  getWeekly: () => get<RangeProgress>('/api/dashboard/weekly'),
  getMonthly: () => get<RangeProgress>('/api/dashboard/monthly'),
  getAnalysis: (range: DashboardRange, refresh = false) =>
    get<DashboardAnalysis>(`/api/dashboard/analysis?range=${range}${refresh ? '&refresh=1' : ''}`),
};
