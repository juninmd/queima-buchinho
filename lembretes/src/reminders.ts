import type { Reminder, Today } from './types';

const MEALS: [string, string, string][] = [
  ['cafe', '07:30', 'Café da manhã'], ['almoco', '12:00', 'Almoço'],
  ['cafe_tarde', '16:00', 'Café da tarde'], ['jantar', '19:30', 'Jantar'],
];
const WATER_TIMES = ['09:00', '11:00', '14:00', '17:00', '20:00'];

/** Monta a agenda do dia a partir do estado da API (mesmas regras do bot). */
export function buildReminders(t: Today): Reminder[] {
  const list: Reminder[] = [
    { id: 'ficha', time: '06:00', kind: 'ficha', title: 'Ficha de treino', detail: 'Hora de queimar', done: t.trained },
    ...MEALS.map(([k, time, title]): Reminder => ({ id: k, time, kind: 'refeicao', title, detail: 'Marque quando comer', done: !!t.habits[k] })),
    ...WATER_TIMES.map((time): Reminder => ({
      id: `agua-${time}`, time, kind: 'agua', title: 'Beber água',
      detail: `${t.water.ml} / ${t.water.goalMl} ml`, done: t.water.ml >= t.water.paceMl,
    })),
    { id: 'fechamento', time: '21:30', kind: 'fechamento', title: 'Fechamento do dia', detail: 'Mika vai conferir', done: false },
  ];
  return list.sort((a, b) => a.time.localeCompare(b.time));
}

export const minutes = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

/** Próximo lembrete pendente a partir de `now` (minutos desde 00:00). */
export const nextPending = (list: Reminder[], now: number): Reminder | undefined =>
  list.find((r) => !r.done && minutes(r.time) >= now);

/** Lembretes pendentes cujo horário está dentro da janela [from, now]. */
export const due = (list: Reminder[], from: number, now: number): Reminder[] =>
  list.filter((r) => !r.done && minutes(r.time) > from && minutes(r.time) <= now);
