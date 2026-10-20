/** Mesma regra do bot: vírgula ou ponto decimal; "1.234,5" e "82,5kg" são recusados em vez de adivinhados. */
export function parseDecimal(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(t)) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(raw: string): number | null {
  const t = raw.trim().replace(/\.(?=\d{3}(?:\D|$))/g, '');
  return /^\d+$/.test(t) ? Number(t) : null;
}

export const fmt = (n: number): string => Math.round(n).toLocaleString('pt-BR');
export const fmtKg = (n: number): string => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
