import { mockToday } from './mock';
import type { Config, Today } from './types';

const KEY = 'qb.lembretes.config';

export function loadConfig(): Config | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Config | null;
    return c?.baseUrl && c.token ? c : null;
  } catch { return null; }
}
export function saveConfig(c: Config): void {
  localStorage.setItem(KEY, JSON.stringify({ baseUrl: c.baseUrl.trim().replace(/\/+$/, ''), token: c.token.trim() }));
}
export const clearConfig = (): void => localStorage.removeItem(KEY);

async function call<T>(cfg: Config, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(cfg.baseUrl + path, {
    method,
    headers: { Authorization: `Bearer ${cfg.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Sem configuração → mock. Com configuração → API do cluster (/api/app/today). */
export const isMock = (): boolean => !loadConfig();
export async function fetchToday(): Promise<Today> {
  const cfg = loadConfig();
  return cfg ? call<Today>(cfg, 'GET', '/api/app/today') : mockToday();
}
export async function markHabit(key: string, done: boolean): Promise<void> {
  const cfg = loadConfig();
  if (cfg) await call(cfg, 'PUT', `/api/habits/${key}`, { done });
}
export async function addWater(ml: number): Promise<void> {
  const cfg = loadConfig();
  if (cfg) await call(cfg, 'POST', '/api/metrics', { type: 'water', value: ml });
}
