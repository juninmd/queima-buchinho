/**
 * Decimal digitado por brasileiro: aceita vírgula ou ponto ("82,5" / "82.5").
 * Retorna null para qualquer coisa ambígua ("1.234,5", "82,5kg", "") em vez de truncar.
 */
export function parseDecimalBR(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(s)) return null;
  return parseFloat(s.replace(',', '.'));
}

/** Inteiro com separador de milhar opcional ("10.000" = 10000); decimal é rejeitado. */
export function parseIntegerBR(raw: string): number | null {
  const s = raw.trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseInt(s.replace(/\./g, ''), 10);
  if (/^\d{1,7}$/.test(s)) return parseInt(s, 10);
  return null;
}

/** 82.4 -> "82,4"; uma casa decimal fixa, padrão das medidas corporais. */
export const formatDecimalBR = (n: number): string =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
