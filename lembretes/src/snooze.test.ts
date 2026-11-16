import { describe, expect, it } from 'vitest';
import { dueSnoozed, prune, snooze } from './snooze';

describe('soneca', () => {
  it('adia 10 min e vence na janela', () => {
    const s = snooze({}, 'almoco', 720);
    expect(s.almoco).toBe(730);
    expect(dueSnoozed(s, 729, 730)).toEqual(['almoco']);
    expect(dueSnoozed(s, 730, 731)).toEqual([]);
  });
  it('prune remove vencidas e concluídas', () => {
    expect(prune({ a: 700, b: 800, c: 900 }, 750, new Set(['c']))).toEqual({ b: 800 });
  });
});
