import { describe, expect, it } from 'vitest';
import './test-setup';
import { mockToday } from './mock';
import { loadSettings } from './settings';
import { chart, view } from './view';

const state = () => ({ today: mockToday(), error: '', mika: 'oi', chat: [], chatOpen: false, now: 600, set: loadSettings(), update: null, updating: false, queued: 0, hist: [] });
describe('view', () => {
  it('escapa texto do usuário no chat', () => {
    const s = { ...state(), chatOpen: true, chat: [{ me: true, text: '<img onerror=x>' }] };
    expect(view(s)).not.toContain('<img onerror');
  });
  it('mostra botão de soneca nos pendentes e meta customizada', () => {
    const s = state(); s.set.goalMl = 2000;
    const h = view(s); expect(h).toContain('data-snooze'); expect(h).toContain('/ 2000 ml');
  });
  it('avisa fila offline', () => expect(view({ ...state(), queued: 2 })).toContain('2 ação(ões) aguardando'));
  it('gráfico tem 7 colunas', () => {
    const d = Array.from({ length: 7 }, (_, i) => ({ date: `2026-01-0${i + 1}`, ml: 1000, goal: 2000, done: 3, total: 6 }));
    expect(chart(d).match(/class="hd"/g)).toHaveLength(7);
  });
});
