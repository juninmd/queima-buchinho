import { CATALOG_MAP } from '../../src/features/ficha/catalog';
import { FAT_BURN_PLANS, WEEKDAY_PLAN, PLAN_MAP } from '../../src/features/ficha/plans';
import type { Grupo } from '../../src/features/ficha/types';

const grupoDe = (key: string): Grupo => CATALOG_MAP.get(key)!.grupo;

/** Séries semanais por grupo muscular, somando só a musculação (sem o bloco de cárdio). */
function volumeSemanal(): Map<Grupo, number> {
  const vol = new Map<Grupo, number>();
  for (const plan of FAT_BURN_PLANS) {
    for (const item of plan.itens) {
      const g = grupoDe(item.key);
      vol.set(g, (vol.get(g) ?? 0) + item.series);
    }
  }
  return vol;
}

/** Dias (0 = segunda) em que o grupo aparece na musculação. */
function diasDoGrupo(grupo: Grupo): number[] {
  return Object.values(WEEKDAY_PLAN)
    .map((key, dia) => (PLAN_MAP.get(key)!.itens.some(i => grupoDe(i.key) === grupo) ? dia : -1))
    .filter(d => d >= 0);
}

describe('Distribuição muscular da semana', () => {
  const vol = volumeSemanal();

  it('dá 10+ séries semanais a cada músculo grande — mínimo para manter massa magra em déficit', () => {
    for (const g of ['quadriceps', 'posterior', 'peito', 'costas', 'ombro', 'core'] as Grupo[]) {
      expect(vol.get(g) ?? 0).toBeGreaterThanOrEqual(10);
    }
  });

  it('não deixa braço e panturrilha sem trabalho direto', () => {
    for (const g of ['biceps', 'triceps', 'panturrilha'] as Grupo[]) {
      expect(vol.get(g) ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it('puxa pelo menos tanto quanto empurra (costas >= peito)', () => {
    expect(vol.get('costas')!).toBeGreaterThanOrEqual(vol.get('peito')!);
  });

  it('treina cada músculo grande ao menos 2x por semana', () => {
    for (const g of ['quadriceps', 'posterior', 'peito', 'costas', 'ombro', 'core'] as Grupo[]) {
      expect(diasDoGrupo(g).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('nunca coloca peito ou costas em dias seguidos — 48 h de recuperação', () => {
    for (const g of ['peito', 'costas'] as Grupo[]) {
      const dias = diasDoGrupo(g);
      for (let i = 1; i < dias.length; i++) expect(dias[i] - dias[i - 1]).toBeGreaterThanOrEqual(2);
    }
  });

  it('abre todo dia com exercício de grupo grande, nunca com isolador ou core', () => {
    const grandes: Grupo[] = ['quadriceps', 'posterior', 'peito', 'costas', 'ombro', 'full'];
    for (const plan of FAT_BURN_PLANS) expect(grandes).toContain(grupoDe(plan.itens[0].key));
  });

  it('todo exercício do catálogo tem grupo, e cárdio é marcado como cárdio', () => {
    for (const plan of FAT_BURN_PLANS) {
      expect(grupoDe(plan.cardio.key)).toBe('cardio');
      for (const item of plan.itens) expect(grupoDe(item.key)).not.toBe('cardio');
    }
  });
});
