import type { Fase, Grupo, PlanItem } from './types';

/** Segunda-feira que abre o primeiro mesociclo. Tudo deriva da data: sem estado no banco. */
const EPOCH_UTC = Date.UTC(2026, 0, 5);
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

const FASES: Array<Pick<Fase, 'nome' | 'dica'>> = [
  { nome: 'Adaptação', dica: 'Pare 2-3 reps antes da falha (RIR 2-3) e capriche na técnica.' },
  { nome: 'Acúmulo', dica: '+1 série nos dois primeiros exercícios. RIR 2.' },
  { nome: 'Intensificação', dica: '+1 série nos dois primeiros; última série perto da falha (RIR 0-1).' },
  { nome: 'Deload', dica: 'Mesma carga, metade das séries, longe da falha. Recupera para o próximo bloco.' },
];

const mod = (n: number, m: number): number => ((n % m) + m) % m;

/**
 * Mesociclo de 4 semanas: 3 semanas de volume crescente + 1 de deload. A cada mesociclo
 * o bloco alterna entre A (exercícios base) e B (variações) — estímulo novo sem perder o padrão.
 */
export function faseDoDia(data: string): Fase {
  const [y, m, d] = data.split('-').map(Number);
  const semanas = Math.floor((Date.UTC(y, m - 1, d) - EPOCH_UTC) / SEMANA_MS);
  const semana = (mod(semanas, 4) + 1) as Fase['semana'];
  const bloco = mod(Math.floor(semanas / 4), 2) === 0 ? 'A' : 'B';
  return { semana, bloco, ...FASES[semana - 1], deload: semana === 4 };
}

/** Ajusta a prescrição do plano à fase: troca pela variação no bloco B e mexe só nas séries. */
export function aplicarFase(itens: PlanItem[], fase: Fase): PlanItem[] {
  return itens.map((item, i) => {
    const key = fase.bloco === 'B' && item.alt ? item.alt : item.key;
    let series = item.series;
    if (fase.deload) series = Math.max(2, Math.round(series / 2));
    else if (fase.semana > 1 && i < 2) series += 1;
    return { ...item, key, series };
  });
}

/** Progressão dupla: perna aguenta saltos maiores; tronco e braço sobem de 2,5 em 2,5 kg. */
export function incrementoKg(grupo: Grupo): number {
  return grupo === 'quadriceps' || grupo === 'posterior' ? 5 : 2.5;
}
