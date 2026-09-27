import { formatDecimalBR, parseDecimalBR, parseIntegerBR } from '../../src/utils/number';

describe('parseDecimalBR', () => {
  it.each([
    ['82,5', 82.5], ['82.5', 82.5], ['82', 82], [' 82,55 ', 82.55], ['0,5', 0.5],
  ])('parses %p', (raw, expected) => expect(parseDecimalBR(raw)).toBe(expected));

  it.each(['', '82,5kg', '1.234,5', '82,555', 'abc', '-3', '8 2', '١٢'])(
    'rejects ambiguous %p instead of truncating', raw => expect(parseDecimalBR(raw)).toBeNull());
});

describe('parseIntegerBR', () => {
  it.each([['8000', 8000], ['10.000', 10000], ['1.000.000', 1000000]])(
    'parses %p', (raw, expected) => expect(parseIntegerBR(raw)).toBe(expected));

  it.each(['10,5', '10.00', '', '1.0000', 'x'])('rejects %p', raw => expect(parseIntegerBR(raw)).toBeNull());
});

describe('formatDecimalBR', () => {
  it('uses comma and one decimal', () => {
    expect(formatDecimalBR(82.44)).toBe('82,4');
    expect(formatDecimalBR(80)).toBe('80,0');
  });
});
