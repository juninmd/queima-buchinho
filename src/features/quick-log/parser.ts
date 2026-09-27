import { parseDecimalBR } from '../../utils/number';

export type QuickLog =
  | { kind: 'water'; ml: number }
  | { kind: 'weight'; kg: number }
  | { kind: 'workout' }
  | { kind: 'cardio' };

const normalize = (t: string): string =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// Negação ou pergunta nunca vira registro: "não treinei", "bebi 500ml?".
const NEGATION = /\b(nao|nem|nunca)\b/;
const WATER = /^(?:ja )?(?:bebi|tomei) (\d+(?:[.,]\d+)?) ?(ml|l|litros?|copos?)(?: de agua)?(?: hoje)?$/;
const WEIGHT = /^(?:hoje )?(?:pesei|peso|pesando) ?:? ?(\d{2,3}(?:[.,]\d{1,2})?) ?(?:kg|quilos?)?(?: hoje)?$/;
const WORKOUT = /^(?:ja )?(?:treinei|malhei|fui (?:na|pra|para a) academia)(?: \S+){0,3}$/;
const CARDIO = /^(?:ja )?(?:fiz (?:o )?cardio|corri|pedalei)(?: \S+){0,4}$/;
const ML_PER_UNIT: Record<string, number> = { ml: 1, l: 1000, litro: 1000, litros: 1000, copo: 250, copos: 250 };

/**
 * Parser determinístico (sem LLM) para registros rápidos em texto livre.
 * Só casa frases curtas e inequívocas; o resto segue para a conversa com a Mika.
 */
export function parseQuickLog(text: string): QuickLog | null {
  const t = normalize(text).replace(/[.!]+$/, '');
  if (!t || t.length > 60 || t.includes('?') || NEGATION.test(t)) return null;

  const water = WATER.exec(t);
  if (water) {
    const n = parseDecimalBR(water[1]);
    return n === null ? null : { kind: 'water', ml: Math.round(n * ML_PER_UNIT[water[2]]) };
  }
  const weight = WEIGHT.exec(t);
  if (weight) {
    const kg = parseDecimalBR(weight[1]);
    return kg === null ? null : { kind: 'weight', kg };
  }
  if (WORKOUT.test(t)) return { kind: 'workout' };
  if (CARDIO.test(t)) return { kind: 'cardio' };
  return null;
}
