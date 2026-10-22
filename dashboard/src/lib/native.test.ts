import { describe, expect, it } from 'vitest';
import { serverAction, tabHashOf } from './native';

describe('native', () => {
  it('botões de água passam direto; "Já comi" vira a refeição da tag', () => {
    expect(serverAction('water_300', {})).toBe('water_300');
    expect(serverAction('meal_done', { tag: 'refeicao-almoco' })).toBe('meal_almoco');
  });

  it('toque simples ou ação desconhecida não executa nada', () => {
    expect(serverAction('tap', { tag: 'agua' })).toBeNull();
    expect(serverAction('meal_done', { tag: 'agua' })).toBeNull();
    expect(serverAction('apagar_tudo', {})).toBeNull();
  });

  it('deep link só aceita hash interno', () => {
    expect(tabHashOf({ url: '/#treino' })).toBe('#treino');
    expect(tabHashOf({ url: 'https://evil.com' })).toBe('');
    expect(tabHashOf({})).toBe('');
  });
});
