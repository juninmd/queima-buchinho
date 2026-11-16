import { describe, expect, it } from 'vitest';
import { mockToday } from './mock';
import { buildReminders } from './reminders';
import { hash, plan } from './schedule';

describe('agendamento', () => {
  const list = buildReminders(mockToday());
  const base = new Date(2026, 0, 10, 11, 30);
  it('hoje só o que ainda vai tocar + todos de amanhã', () => {
    const p = plan(list, {}, base);
    const today = p.filter((x) => x.at.getDate() === 10), tomorrow = p.filter((x) => x.at.getDate() === 11);
    expect(today.every((x) => x.at > base)).toBe(true);
    expect(tomorrow).toHaveLength(list.length);
  });
  it('soneca substitui o horário original', () => {
    const almoco = plan(list, { almoco: 11 * 60 + 40 }, base).filter((x) => x.title.includes('Almoço') && x.at.getDate() === 10);
    expect(almoco).toHaveLength(1); expect(almoco[0].at.getMinutes()).toBe(40);
  });
  it('ids estáveis e únicos', () => {
    expect(hash('a@0')).toBe(hash('a@0'));
    const ids = plan(list, {}, base).map((x) => x.id); expect(new Set(ids).size).toBe(ids.length);
  });
});
