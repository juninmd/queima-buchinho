import { CATALOG, CATALOG_MAP } from '../../src/features/ficha/catalog';
import { FAT_BURN_PLANS, WEEKDAY_PLAN } from '../../src/features/ficha/plans';
import { buildFicha, cardioIndex, getPlanForDay } from '../../src/features/ficha/generator';

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

describe('Catálogo da ficha', () => {
  it('não tem chave duplicada', () => {
    expect(CATALOG_MAP.size).toBe(CATALOG.length);
  });

  it('toda entrada tem nome do aparelho e imagem no CDN esperado', () => {
    for (const e of CATALOG) {
      expect(e.aparelho.length).toBeGreaterThan(2);
      expect(e.img.startsWith(IMG_BASE)).toBe(true);
      expect(e.img).toMatch(/\/\d+\.jpg$/);
    }
  });

  it('cárdio de esteira e bicicleta está no catálogo', () => {
    const cardio = CATALOG.filter(e => e.key.startsWith('esteira_') || e.key.startsWith('bike_'));
    expect(cardio.some(e => e.aparelho.includes('Esteira'))).toBe(true);
    expect(cardio.some(e => e.aparelho.includes('Bicicleta'))).toBe(true);
    // Cárdio não tem carga em kg: o botão de ajuste não pode aparecer para ele.
    expect(cardio.every(e => e.cargaPadraoKg === null)).toBe(true);
  });
});

describe('Planos de queima de gordura', () => {
  it('cobre segunda a sábado e deixa domingo de fora', () => {
    expect(Object.keys(WEEKDAY_PLAN)).toHaveLength(6);
    expect(getPlanForDay('domingo')).toBeNull();
    expect(getPlanForDay('segunda-feira')?.key).toBe('full_a');
  });

  it('todo exercício prescrito existe no catálogo', () => {
    for (const plan of FAT_BURN_PLANS) {
      for (const item of [...plan.itens, plan.cardio]) {
        expect(CATALOG_MAP.has(item.key)).toBe(true);
      }
    }
  });

  it('não deixa exercício órfão no catálogo', () => {
    const usados = new Set(FAT_BURN_PLANS.flatMap(p => [...p.itens, p.cardio].map(i => i.key)));
    expect(CATALOG.filter(e => !usados.has(e.key)).map(e => e.key)).toEqual([]);
  });

  it('mantém descanso curto e repetição alta em todo dia — o protocolo de queima', () => {
    for (const plan of FAT_BURN_PLANS) {
      expect(plan.itens).toHaveLength(6);
      for (const item of plan.itens) expect(item.descansoS).toBeLessThanOrEqual(60);
      expect(plan.cardio.reps).toMatch(/min/);
    }
  });

  it('alterna esteira e bicicleta ao longo da semana', () => {
    const cardios = FAT_BURN_PLANS.map(p => p.cardio.key);
    expect(cardios.some(k => k.startsWith('esteira_'))).toBe(true);
    expect(cardios.some(k => k.startsWith('bike_'))).toBe(true);
  });
});

describe('buildFicha', () => {
  const plan = getPlanForDay('segunda-feira')!;

  it('põe o cárdio sempre como último bloco', () => {
    const ficha = buildFicha(plan, new Map(), '2026-09-07');
    expect(cardioIndex(ficha)).toBe(ficha.exercicios.length - 1);
    expect(ficha.exercicios[cardioIndex(ficha)].key).toBe(plan.cardio.key);
    expect(ficha.exercicios).toHaveLength(7);
  });

  it('usa a carga salva no lugar da sugestão do catálogo', () => {
    const ficha = buildFicha(plan, new Map([['agacho_barra', 47.5]]), '2026-09-07');
    expect(ficha.exercicios.find(e => e.key === 'agacho_barra')?.cargaKg).toBe(47.5);
  });

  it('mantém sem carga o exercício de peso do corpo, mesmo com valor salvo', () => {
    const ficha = buildFicha(plan, new Map([['prancha', 20]]), '2026-09-07');
    expect(ficha.exercicios.find(e => e.key === 'prancha')?.cargaKg).toBeNull();
  });

  it('é determinístico: mesma entrada, mesma ficha', () => {
    const a = buildFicha(plan, new Map(), '2026-09-07');
    const b = buildFicha(plan, new Map(), '2026-09-07');
    expect(a).toEqual(b);
  });
});
