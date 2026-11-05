import {
  DELOAD_MAX_SESSIONS,
  PROGRESSION_SESSIONS,
  readyToProgress,
  roundToHalfKg,
  shouldDeload,
  type SessionSnapshot,
} from '../../src/features/ficha/progression';
import { applyDeload, buildFicha, getPlanForDay, markProgression } from '../../src/features/ficha/generator';

const sess = (data: string, loads: Record<string, number | null>, deload = false): SessionSnapshot =>
  ({ data, loads, deload });

const ficha = () =>
  buildFicha(getPlanForDay('segunda-feira')!, new Map([['agacho_barra', 30]]), '2026-09-07');

describe('readyToProgress', () => {
  it('libera o exercício que repetiu a mesma carga nas 3 últimas sessões', () => {
    const h = [
      sess('2026-09-07', { agacho_barra: 30, supino_barra: 40 }),
      sess('2026-09-05', { agacho_barra: 30, supino_barra: 35 }),
      sess('2026-09-03', { agacho_barra: 30, supino_barra: 30 }),
    ];
    expect(readyToProgress(h)).toEqual(['agacho_barra']);
  });

  it('não libera com menos de 3 sessões: uma semana boa não é progressão', () => {
    const h = [sess('2026-09-07', { agacho_barra: 30 }), sess('2026-09-05', { agacho_barra: 30 })];
    expect(readyToProgress(h)).toEqual([]);
    expect(PROGRESSION_SESSIONS).toBe(3);
  });

  it('ignora exercício sem carga externa (peso do corpo e cárdio)', () => {
    const h = Array.from({ length: 3 }, (_, i) => sess(`2026-09-0${7 - i}`, { prancha: null }));
    expect(readyToProgress(h)).toEqual([]);
  });

  it('ignora sessões de semana leve: carga reduzida não conta como repetição', () => {
    const h = [
      sess('2026-09-07', { agacho_barra: 27 }, true),
      sess('2026-09-05', { agacho_barra: 27 }, true),
      sess('2026-09-03', { agacho_barra: 27 }, true),
    ];
    expect(readyToProgress(h)).toEqual([]);
  });
});

describe('shouldDeload', () => {
  it('pede semana leve quando a carga cai em 2 ou mais exercícios', () => {
    const h = [
      sess('2026-09-07', { agacho_barra: 25, supino_barra: 30 }),
      sess('2026-09-01', { agacho_barra: 30, supino_barra: 40 }),
    ];
    expect(shouldDeload(h, '2026-09-07').deload).toBe(true);
  });

  it('pede semana leve depois de 2 semanas cheias sem folga', () => {
    const diasAtras = (n: number) =>
      new Date(Date.parse('2026-09-07T00:00:00Z') - n * 86_400_000).toISOString().slice(0, 10);
    const h = Array.from({ length: DELOAD_MAX_SESSIONS }, (_, i) =>
      sess(diasAtras(i), { agacho_barra: 30 }));
    expect(shouldDeload(h, '2026-09-07')).toMatchObject({ deload: true });
  });

  it('não pede nada com histórico curto e carga estável', () => {
    const h = [sess('2026-09-07', { agacho_barra: 30 }), sess('2026-09-05', { agacho_barra: 30 })];
    expect(shouldDeload(h, '2026-09-07').deload).toBe(false);
  });

  it('não encadeia deload: a queda que o próprio deload causou é ignorada', () => {
    // Sem o filtro, a semana leve viraria "regressão" e pediria outra semana leve para sempre.
    const h = [
      sess('2026-09-07', { agacho_barra: 27, supino_barra: 36 }, true),
      sess('2026-09-01', { agacho_barra: 30, supino_barra: 40 }),
    ];
    expect(shouldDeload(h, '2026-09-07').deload).toBe(false);
  });

  it('esquece o que ficou fora da janela de 14 dias', () => {
    const h = [
      sess('2026-09-07', { agacho_barra: 25, supino_barra: 30 }),
      sess('2026-08-01', { agacho_barra: 30, supino_barra: 40 }),
    ];
    expect(shouldDeload(h, '2026-09-07').deload).toBe(false);
  });
});

describe('applyDeload', () => {
  it('corta 10% da carga, arredonda no meio quilo e guarda a carga cheia', () => {
    const leve = applyDeload(ficha());
    const agacho = leve.exercicios.find(e => e.key === 'agacho_barra')!;
    expect(agacho.cargaKg).toBe(27);
    expect(agacho.cargaBaseKg).toBe(30);
    expect(leve.deload).toBe(true);
  });

  it('tira uma série sem descer de 2 e não inventa carga onde não existe', () => {
    const base = ficha();
    const leve = applyDeload(base);
    leve.exercicios.forEach((ex, i) => {
      expect(ex.series).toBe(Math.max(2, base.exercicios[i].series - 1));
      if (base.exercicios[i].cargaKg === null) expect(ex.cargaKg).toBeNull();
    });
  });

  it('arredonda para o meio quilo mais próximo', () => {
    expect(roundToHalfKg(27.9)).toBe(28);
    expect(roundToHalfKg(27.2)).toBe(27);
  });
});

describe('markProgression', () => {
  it('marca só exercício com carga ajustável', () => {
    const marcada = markProgression(ficha(), ['agacho_barra', 'prancha']);
    expect(marcada.exercicios.find(e => e.key === 'agacho_barra')!.podeSubir).toBe(true);
    expect(marcada.exercicios.find(e => e.key === 'prancha')!.podeSubir).toBeUndefined();
  });
});
