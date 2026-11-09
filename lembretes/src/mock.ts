import type { Today } from './types';

/** Dados fictícios usados enquanto a API do cluster não está configurada. */
export const mockToday = (): Today => ({
  habits: { treino: true, cafe: true, almoco: false },
  water: { ml: 1200, goalMl: 3000, paceMl: 1800 },
  streak: 6,
  trained: true,
  pauseUntil: null,
});
