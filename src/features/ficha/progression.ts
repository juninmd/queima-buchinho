/**
 * Progressão de carga e deload: as duas decisões que separam um checklist de um treino.
 * Tudo aqui é função pura sobre o histórico já persistido em `ficha_sessions` — nada de
 * LLM, porque prescrever carga com texto gerado é como pedir para o dado escolher o peso.
 */

/** Sessão concluída, reduzida ao que interessa: a carga usada em cada exercício. */
export interface SessionSnapshot {
  data: string;
  loads: Record<string, number | null>;
  /** Sessão de semana leve: carga artificialmente baixa, não serve de base para decidir. */
  deload?: boolean;
}

/** Sessões seguidas com a mesma carga antes de sugerir subida. */
export const PROGRESSION_SESSIONS = 3;
export const PROGRESSION_STEP_KG = 2.5;

/** Janela e gatilhos do deload. 14 dias cobre duas semanas de plano seg-sáb (12 treinos). */
export const DELOAD_WINDOW_DAYS = 14;
export const DELOAD_MAX_SESSIONS = 12;
export const DELOAD_MIN_REGRESSIONS = 2;
export const DELOAD_FACTOR = 0.9;
export const DELOAD_DAYS = 7;

const isLoad = (v: number | null | undefined): v is number => typeof v === 'number' && v > 0;

/** Arredonda para o meio quilo mais próximo: anilha de 1,25 kg é o menor par real. */
export const roundToHalfKg = (kg: number): number => Math.round(kg * 2) / 2;

/**
 * Exercícios prontos para subir: as `PROGRESSION_SESSIONS` sessões concluídas mais recentes
 * que prescreveram o exercício usaram exatamente a mesma carga. Repetir carga é o único sinal
 * de "dominou" que existe sem perguntar RPE ao usuário — e perguntar todo dia mata o bot.
 */
export function readyToProgress(all: SessionSnapshot[]): string[] {
  const history = all.filter(s => !s.deload);
  const recente = history[0];
  if (!recente) return [];

  return Object.keys(recente.loads).filter(key => {
    const usadas = history
      .filter(s => isLoad(s.loads[key]))
      .slice(0, PROGRESSION_SESSIONS)
      .map(s => s.loads[key] as number);
    return usadas.length === PROGRESSION_SESSIONS && usadas.every(kg => kg === usadas[0]);
  });
}

/** Diferença em dias entre duas datas `YYYY-MM-DD`, sem fuso: as duas já são de Brasília. */
function daysBetween(fim: string, inicio: string): number {
  const ms = Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`);
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : Math.round(ms / 86_400_000);
}

/** Exercícios em que a carga mais recente é MENOR que a da sessão mais antiga da janela. */
function regressoes(history: SessionSnapshot[]): number {
  const recente = history[0];
  const antiga = history[history.length - 1];
  if (!recente || !antiga || recente === antiga) return 0;
  return Object.keys(recente.loads).filter(key => {
    const agora = recente.loads[key];
    const antes = antiga.loads[key];
    return isLoad(agora) && isLoad(antes) && agora < antes;
  }).length;
}

export interface DeloadVerdict {
  deload: boolean;
  motivo: string;
}

/**
 * Semana leve: ou o corpo já pediu (carga caindo em vários exercícios), ou o calendário
 * pede (duas semanas cheias sem folga). Sem isso a streak vira lesão e o usuário some —
 * abandono é a falha mais comum desse tipo de bot, não falta de exercício novo.
 */
export function shouldDeload(all: SessionSnapshot[], hoje: string): DeloadVerdict {
  // Semana leve reduz a carga de propósito: contá-la viraria um laço, cada deload
  // pedindo o próximo por "regressão" que ele mesmo causou.
  const janela = all.filter(s => !s.deload && daysBetween(hoje, s.data) < DELOAD_WINDOW_DAYS);
  const caindo = regressoes(janela);
  if (caindo >= DELOAD_MIN_REGRESSIONS) {
    return { deload: true, motivo: `carga caiu em ${caindo} exercícios nas últimas 2 semanas` };
  }

  const treinos = new Set(janela.map(s => s.data)).size;
  if (treinos >= DELOAD_MAX_SESSIONS) {
    return { deload: true, motivo: `${treinos} treinos em ${DELOAD_WINDOW_DAYS} dias, sem semana leve` };
  }
  return { deload: false, motivo: '' };
}
