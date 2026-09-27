// Janela de hidratação: meta proporcional sobe linearmente de 0 (07h) até 100% (19h).
const START_HOUR = 7;
const END_HOUR = 19;

/** Quanto de água já deveria ter sido bebido até esta hora para bater a meta no dia. */
export function waterTargetAt(hour: number, goalMl: number): number {
  const ratio = (hour - START_HOUR) / (END_HOUR - START_HOUR);
  return Math.round(goalMl * Math.min(Math.max(ratio, 0), 1));
}

/** Lembrete só quando está atrasado em relação ao ritmo; com a meta em dia, silêncio. */
export const isBehindWaterPace = (waterMl: number, hour: number, goalMl: number): boolean =>
  waterMl < waterTargetAt(hour, goalMl);

export function getBrasiliaHour(now: Date = new Date()): number {
  return Number(now.toLocaleString('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false })) % 24;
}
