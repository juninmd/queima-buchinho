import { fichaService } from '../../src/features/ficha/ficha.service';
import { progressionService } from '../../src/features/ficha/progression.service';
import { query } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
jest.mock('../../src/services/habits.service', () => ({ habitsService: { markHabit: jest.fn() } }));
jest.mock('../../src/services/workout.service', () => ({ workoutService: { logWorkout: jest.fn() } }));
jest.mock('../../src/features/ficha/progression.service', () => ({
  progressionService: { getHistory: jest.fn(), isDeloadActive: jest.fn(), bumpLoads: jest.fn(), startDeload: jest.fn() },
}));
jest.mock('../../src/utils/time', () => ({
  getBrasiliaDayName: () => 'segunda-feira',
  getBrasiliaDateString: () => '2026-09-07',
}));

const mockQuery = query as jest.Mock;
const sess = (data: string, kg: number, deload = false) =>
  ({ data, loads: { agacho_barra: kg }, deload });
/** Dois exercícios: o deload só dispara com regressão em 2 ou mais. */
const caindo = (data: string, agacho: number, supino: number) =>
  ({ data, loads: { agacho_barra: agacho, supino_barra: supino }, deload: false });

describe('fichaService.buildToday', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [{ exercise_key: 'agacho_barra', load_kg: '30' }] });
    (progressionService.getHistory as jest.Mock).mockResolvedValue([]);
    (progressionService.isDeloadActive as jest.Mock).mockResolvedValue(false);
  });

  const agacho = (f: any) => f.exercicios.find((e: any) => e.key === 'agacho_barra');

  it('marca o exercício pronto para subir depois de 3 sessões na mesma carga', async () => {
    (progressionService.getHistory as jest.Mock).mockResolvedValue(
      [sess('2026-09-07', 30), sess('2026-09-05', 30), sess('2026-09-03', 30)]
    );
    const ficha = await fichaService.buildToday(7);
    expect(agacho(ficha).podeSubir).toBe(true);
    expect(ficha!.sugereDeload).toBeUndefined();
  });

  it('entrega a ficha reduzida enquanto a semana leve estiver valendo', async () => {
    (progressionService.isDeloadActive as jest.Mock).mockResolvedValue(true);
    const ficha = await fichaService.buildToday(7);
    expect(ficha!.deload).toBe(true);
    expect(agacho(ficha).cargaKg).toBe(27);
    expect(agacho(ficha).cargaBaseKg).toBe(30);
  });

  it('sugere a semana leve sem impor: a ficha do dia continua cheia', async () => {
    (progressionService.getHistory as jest.Mock).mockResolvedValue(
      [caindo('2026-09-07', 20, 30), caindo('2026-09-01', 30, 40)]
    );
    const ficha = await fichaService.buildToday(7);
    expect(ficha!.sugereDeload).toContain('carga caiu');
    expect(ficha!.deload).toBeUndefined();
    expect(agacho(ficha).cargaKg).toBe(30);
  });

  it('deload valendo tem prioridade e não fica pedindo outro deload', async () => {
    (progressionService.isDeloadActive as jest.Mock).mockResolvedValue(true);
    (progressionService.getHistory as jest.Mock).mockResolvedValue(
      [caindo('2026-09-07', 20, 30), caindo('2026-09-01', 30, 40)]
    );
    const ficha = await fichaService.buildToday(7);
    expect(ficha!.sugereDeload).toBeUndefined();
  });
});
