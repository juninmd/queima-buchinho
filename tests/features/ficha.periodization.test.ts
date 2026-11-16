import { CATALOG_MAP } from '../../src/features/ficha/catalog';
import { FAT_BURN_PLANS } from '../../src/features/ficha/plans';
import { aplicarFase, faseDoDia, incrementoKg } from '../../src/features/ficha/periodization';
import { buildFicha, getPlanForDay } from '../../src/features/ficha/generator';
import { renderFicha, stepperKeyboard } from '../../src/features/ficha/render';

// 2026-08-17 é a segunda-feira que abre um mesociclo do bloco A (semana 1).
const SEG = ['2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14'];

describe('faseDoDia', () => {
  it('roda 4 semanas (3 de carga + deload) e alterna o bloco a cada mesociclo', () => {
    expect(SEG.map(d => faseDoDia(d).semana)).toEqual([1, 2, 3, 4, 1]);
    expect(SEG.map(d => faseDoDia(d).bloco)).toEqual(['A', 'A', 'A', 'A', 'B']);
    expect(faseDoDia('2026-09-07').deload).toBe(true);
  });

  it('mantém a mesma fase de segunda a sábado', () => {
    expect(faseDoDia('2026-08-22')).toEqual(faseDoDia('2026-08-17'));
  });

  it('funciona antes da data de referência (sem semana negativa)', () => {
    expect([1, 2, 3, 4]).toContain(faseDoDia('2025-12-29').semana);
  });
});

describe('aplicarFase', () => {
  const itens = getPlanForDay('segunda-feira')!.itens;

  it('soma 1 série só nos dois multiarticulares nas semanas 2 e 3', () => {
    const s2 = aplicarFase(itens, faseDoDia(SEG[1]));
    expect(s2.map(i => i.series)).toEqual(itens.map((i, idx) => i.series + (idx < 2 ? 1 : 0)));
  });

  it('corta o volume pela metade no deload, nunca abaixo de 2 séries', () => {
    const d = aplicarFase(itens, faseDoDia(SEG[3]));
    d.forEach((i, idx) => {
      expect(i.series).toBeLessThan(itens[idx].series);
      expect(i.series).toBeGreaterThanOrEqual(2);
    });
  });

  it('troca pela variação no bloco B e mantém o resto no bloco A', () => {
    expect(aplicarFase(itens, faseDoDia(SEG[0]))[0].key).toBe('agacho_barra');
    expect(aplicarFase(itens, faseDoDia(SEG[4]))[0].key).toBe('agacho_frontal');
  });
});

describe('Variações do bloco B', () => {
  const comAlt = FAT_BURN_PLANS.flatMap(p => p.itens).filter(i => i.alt);

  it('toda variação existe, treina o mesmo grupo e também tem carga', () => {
    expect(comAlt.length).toBeGreaterThanOrEqual(10);
    for (const i of comAlt) {
      const base = CATALOG_MAP.get(i.key)!;
      const alt = CATALOG_MAP.get(i.alt!)!;
      expect(alt).toBeDefined();
      expect(alt.grupo).toBe(base.grupo);
      expect(alt.cargaPadraoKg === null).toBe(base.cargaPadraoKg === null);
    }
  });
});

describe('Progressão dupla', () => {
  it('sobe 5 kg em perna e 2,5 kg no resto', () => {
    expect(incrementoKg('quadriceps')).toBe(5);
    expect(incrementoKg('posterior')).toBe(5);
    expect(incrementoKg('peito')).toBe(2.5);
  });

  it('o stepper oferece o botão de progredir com o passo do exercício', () => {
    const ficha = buildFicha(getPlanForDay('segunda-feira')!, new Map(), SEG[0]);
    const flat = stepperKeyboard(0, ficha.exercicios[0]).flat();
    expect(flat).toContainEqual({ text: '📈 Progredir (+5 kg)', callback_data: 'fx:adj:0:5' });
  });

  it('mostra a fase na ficha e esconde a regra de progressão no deload', () => {
    const plan = getPlanForDay('segunda-feira')!;
    expect(renderFicha(buildFicha(plan, new Map(), SEG[1]))).toContain('Semana 2/4 · <b>Acúmulo</b>');
    const deload = renderFicha(buildFicha(plan, new Map(), SEG[3]));
    expect(deload).toContain('Deload');
    expect(deload).not.toContain('📈');
  });
});
