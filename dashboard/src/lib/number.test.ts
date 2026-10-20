import { describe, expect, it } from 'vitest';
import { fmtKg, parseDecimal, parseInteger } from './number';

describe('parseDecimal', () => {
  it('aceita vírgula e ponto', () => {
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal(' 82.5 ')).toBe(82.5);
    expect(parseDecimal('80')).toBe(80);
  });
  it('recusa valor ambíguo em vez de adivinhar', () => {
    for (const bad of ['82,5kg', '1.234,5', '', 'abc', '-3', '8,,5']) expect(parseDecimal(bad)).toBeNull();
  });
});

describe('parseInteger', () => {
  it('aceita separador de milhar', () => {
    expect(parseInteger('10.000')).toBe(10000);
    expect(parseInteger('8000')).toBe(8000);
  });
  it('recusa decimais e texto', () => {
    expect(parseInteger('8,5')).toBeNull();
    expect(parseInteger('oito')).toBeNull();
  });
});

describe('fmtKg', () => {
  it('usa uma casa decimal em pt-BR', () => expect(fmtKg(82.5)).toBe('82,5'));
});
