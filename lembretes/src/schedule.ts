import { minutes } from './reminders';
import type { Snoozes } from './snooze';
import type { Reminder } from './types';

export interface Planned { id: number; at: Date; title: string; body: string }

/** id numérico estável (o Android exige int) a partir de texto + dia. */
export function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000;
}
const at = (base: Date, dayOffset: number, min: number): Date => {
  const d = new Date(base); d.setDate(d.getDate() + dayOffset); d.setHours(Math.floor(min / 60), min % 60, 0, 0); return d;
};

/** Agenda do app fechado: pendentes de hoje que ainda vão tocar, sonecas e todos os horários de amanhã. */
export function plan(list: Reminder[], snoozes: Snoozes, base = new Date()): Planned[] {
  const now = base.getHours() * 60 + base.getMinutes();
  const out: Planned[] = [];
  for (const r of list) {
    const m = minutes(r.time);
    const snz = snoozes[r.id];
    if (snz && snz > now && !r.done) out.push({ id: hash(`${r.id}@snooze`), at: at(base, 0, snz), title: `${r.time} · ${r.title}`, body: 'Adiado — hora de resolver.' });
    else if (!r.done && m > now) out.push({ id: hash(`${r.id}@0`), at: at(base, 0, m), title: `${r.time} · ${r.title}`, body: r.detail });
    out.push({ id: hash(`${r.id}@1`), at: at(base, 1, m), title: `${r.time} · ${r.title}`, body: r.detail });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Reagenda tudo via notificações locais (só mobile; no desktop/navegador não faz nada). */
export async function syncSchedule(list: Reminder[], snoozes: Snoozes, enabled: boolean): Promise<void> {
  try {
    const n = await import('@tauri-apps/plugin-notification');
    const old = await n.pending();
    if (old.length) await n.cancel(old.map((p) => p.id));
    if (!enabled) return;
    if (!(await n.isPermissionGranted())) { if ((await n.requestPermission()) !== 'granted') return; }
    for (const p of plan(list, snoozes)) n.sendNotification({ id: p.id, title: p.title, body: p.body, schedule: n.Schedule.at(p.at, false, true) });
  } catch { /* navegador/desktop sem agendamento */ }
}
