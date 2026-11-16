import type { Today } from './types';

/** Histórico diário local (últimos 14 dias) para o gráfico semanal. */
export interface Day { date: string; ml: number; goal: number; done: number; total: number }
const KEY = 'qb.lembretes.history';
export const dayKey = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function loadHistory(): Day[] {
  try { const h = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Day[]; return Array.isArray(h) ? h : []; } catch { return []; }
}
export function record(t: Today, done: number, total: number, date = dayKey()): Day[] {
  const h = loadHistory().filter((d) => d.date !== date);
  h.push({ date, ml: t.water.ml, goal: t.water.goalMl, done, total });
  const out = h.sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  try { localStorage.setItem(KEY, JSON.stringify(out)); } catch { /* sem storage */ }
  return out;
}
/** Últimos 7 dias (mais antigo → hoje); dias sem registro vêm zerados. */
export function last7(h: Day[], today = new Date()): Day[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    const k = dayKey(d);
    return h.find((x) => x.date === k) ?? { date: k, ml: 0, goal: 0, done: 0, total: 0 };
  });
}
