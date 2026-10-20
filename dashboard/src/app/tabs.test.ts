import { describe, expect, it } from 'vitest';
import { tabFromHash } from './tabs';

describe('tabFromHash', () => {
  it('aceita #aba e #/aba', () => {
    expect(tabFromHash('#treino')).toBe('treino');
    expect(tabFromHash('#/mika')).toBe('mika');
  });
  it('cai em hoje quando desconhecida ou vazia', () => {
    expect(tabFromHash('')).toBe('hoje');
    expect(tabFromHash('#xyz')).toBe('hoje');
  });
});
