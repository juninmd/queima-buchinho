/** Soneca: id do lembrete → minuto do dia em que deve tocar de novo. */
export type Snoozes = Record<string, number>;
const KEY = 'qb.lembretes.snooze';
export const SNOOZE_MIN = 10;

export function loadSnoozes(): Snoozes {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Snoozes) ?? {}; } catch { return {}; }
}
export function saveSnoozes(s: Snoozes): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sem storage */ } }
export const snooze = (s: Snoozes, id: string, now: number, min = SNOOZE_MIN): Snoozes => ({ ...s, [id]: now + min });
/** ids cuja soneca venceu em (from, now]. */
export const dueSnoozed = (s: Snoozes, from: number, now: number): string[] =>
  Object.entries(s).filter(([, at]) => at > from && at <= now).map(([id]) => id);
/** Remove sonecas vencidas ou de lembretes já concluídos. */
export const prune = (s: Snoozes, now: number, doneIds: Set<string>): Snoozes =>
  Object.fromEntries(Object.entries(s).filter(([id, at]) => at > now && !doneIds.has(id)));
