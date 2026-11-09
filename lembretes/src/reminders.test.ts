import { describe, expect, it } from 'vitest';
import { mockToday } from './mock';
import { buildReminders, due, nextPending } from './reminders';

describe('reminders', () => {
  const list = buildReminders(mockToday());
  it('ordena por horário', () => expect(list.map((r) => r.time)).toEqual([...list.map((r) => r.time)].sort()));
  it('almoço pendente às 12:00', () => expect(nextPending(list, 11 * 60 + 30)?.id).toBe('almoco'));
  it('due devolve só o que passou na janela', () => expect(due(list, 11 * 60 + 59, 12 * 60).map((r) => r.id)).toEqual(['almoco']));
});
