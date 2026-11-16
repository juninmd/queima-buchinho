import { mockChat, mockMika, mockToday } from './mock';
import { enqueue, flushQueue, type Op } from './queue';
import type { Config, Today } from './types';

const KEY = 'qb.lembretes.config';
const TIMEOUT_MS = 10_000;

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
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(cfg.baseUrl + path, {
      method,
      headers: { Authorization: `Bearer ${cfg.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Tempo esgotado (API não respondeu)');
    throw e;
  } finally { clearTimeout(timer); }
}

/** Sem configuração → mock. Com configuração → API do cluster (/api/app/today). */
export const isMock = (): boolean => !loadConfig();
export async function fetchToday(): Promise<Today> {
  const cfg = loadConfig();
  return cfg ? call<Today>(cfg, 'GET', '/api/app/today') : mockToday();
}
const send = (cfg: Config, op: Op): Promise<unknown> =>
  op.t === 'habit' ? call(cfg, 'PUT', `/api/habits/${op.key}`, { done: op.done }) : call(cfg, 'POST', '/api/metrics', { type: 'water', value: op.ml });

/** Devolve true se a ação foi para a fila offline (API indisponível). */
async function act(op: Op): Promise<boolean> {
  const cfg = loadConfig();
  if (!cfg) return false;
  try { await send(cfg, op); return false; } catch { enqueue(op); return true; }
}
export const markHabit = (key: string, done: boolean): Promise<boolean> => act({ t: 'habit', key, done });
export const addWater = (ml: number): Promise<boolean> => act({ t: 'water', ml });
/** Reenvia ações guardadas offline; devolve quantas foram sincronizadas. */
export async function syncQueue(): Promise<number> {
  const cfg = loadConfig();
  return cfg ? flushQueue((op) => send(cfg, op).then(() => undefined)) : 0;
}

const PROMPTS: Record<string, string> = {
  ficha: 'Lembre-me do treino em 1 frase curta.', refeicao: 'Lembre-me de comer e marcar a refeição em 1 frase curta.',
  agua: 'Me mande beber água em 1 frase curta.', fechamento: 'Avise que vai conferir meu dia em 1 frase curta.',
};
/** Frase da Mika para um lembrete (chat da API; cai no mock se offline). */
const LINE_TTL = 30 * 60_000;
const lines = new Map<string, { at: number; text: string }>();
export async function mikaLine(kind: string): Promise<string> {
  const cfg = loadConfig();
  const hit = lines.get(kind);
  if (cfg && hit && Date.now() - hit.at < LINE_TTL) return hit.text; // evita chamar o LLM a cada refresh
  if (cfg) try {
    const text = (await call<{ message: string }>(cfg, 'POST', '/api/mika/chat', { message: PROMPTS[kind] ?? PROMPTS.agua })).message;
    lines.set(kind, { at: Date.now(), text });
    return text;
  } catch { /* mock */ }
  return mockMika(kind);
}
export async function mikaChat(message: string): Promise<string> {
  const cfg = loadConfig();
  return cfg ? (await call<{ message: string }>(cfg, 'POST', '/api/mika/chat', { message })).message : mockChat(message);
}

/** Mika fala: texto + áudio (mp3 base64) de /api/mika/motivar; sem API devolve só texto de exemplo. */
export async function mikaVoice(): Promise<{ message: string; audio: string | null }> {
  const cfg = loadConfig();
  if (!cfg) return { message: mockMika('ficha'), audio: null };
  const r = await call<{ message: string; audioBase64: string | null }>(cfg, 'POST', '/api/mika/motivar');
  return { message: r.message, audio: r.audioBase64 ? `data:audio/mpeg;base64,${r.audioBase64}` : null };
}
