import { beforeEach, describe, expect, it } from 'vitest';
import './test-setup';
import { last7, loadHistory, record } from './history';
import { mockToday } from './mock';

describe('histórico', () => {
  beforeEach(() => localStorage.clear());
  it('regrava o mesmo dia e mantém 14', () => {
    for (let i = 1; i <= 20; i++) record(mockToday(), i, 20, `2026-01-${String(i).padStart(2, '0')}`);
    record(mockToday(), 5, 20, '2026-01-20');
    const h = loadHistory(); expect(h).toHaveLength(14); expect(h.at(-1)?.done).toBe(5);
  });
  it('last7 preenche dias vazios', () => {
    const d = last7([], new Date(2026, 0, 10)); expect(d).toHaveLength(7); expect(d.at(-1)?.date).toBe('2026-01-10'); expect(d[0].total).toBe(0);
  });
});
