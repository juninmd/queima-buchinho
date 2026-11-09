import type { Today } from './types';

/** Dados fictícios usados enquanto a API do cluster não está configurada. */
export const mockToday = (): Today => ({
  habits: { treino: true, cafe: true, almoco: false },
  water: { ml: 1200, goalMl: 3000, paceMl: 1800 },
  streak: 6,
  trained: true,
  pauseUntil: null,
});

const ROAST: Record<string, string[]> = {
  ficha: ['A ficha não se faz sozinha, gênio. Bora.', 'Seu eu do futuro agradece. Ou chora. Depende de você.'],
  refeicao: ['Comer direito não é opcional, fofo(a).', 'Marca a refeição aí, sem drama.'],
  agua: ['Água. Líquido transparente. Beba.', 'Hidrata, planta murcha não rende.'],
  fechamento: ['Hora do fechamento. Vou conferir cada mentira.', 'Dia acabando: o que você fez de útil?'],
};
export const mockMika = (kind: string): string => {
  const l = ROAST[kind] ?? ROAST.agua;
  return l[Math.floor(Math.random() * l.length)];
};
export const mockChat = (msg: string): string => `Hm, "${msg.slice(0, 40)}"… conecta a API que eu respondo de verdade. 💅`;
