import { fichaService } from '../../src/features/ficha/ficha.service';
import { query } from '../../src/config/database';
import { habitsService } from '../../src/services/habits.service';
import { workoutService } from '../../src/services/workout.service';

jest.mock('../../src/config/database', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
jest.mock('../../src/services/habits.service', () => ({ habitsService: { markHabit: jest.fn() } }));
jest.mock('../../src/services/workout.service', () => ({ workoutService: { logWorkout: jest.fn() } }));

const mockQuery = query as jest.Mock;

describe('FichaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  describe('getLoads', () => {
    it('devolve as cargas salvas convertidas para número', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exercise_key: 'agacho_barra', load_kg: '47.50' }] });
      const loads = await fichaService.getLoads(7);
      expect(loads.get('agacho_barra')).toBe(47.5);
    });

    it('degrada para o padrão do catálogo se o banco cair', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));
      await expect(fichaService.getLoads(7)).resolves.toEqual(new Map());
    });
  });

  describe('adjustLoad', () => {
    const carga = (kg: string) => ({ rows: [{ load_kg: kg }] });

    it('devolve a carga que o banco calculou, não a somada em memória', async () => {
      mockQuery.mockResolvedValueOnce(carga('32.50'));
      await expect(fichaService.adjustLoad(7, 'agacho_barra', 30, 2.5)).resolves.toBe(32.5);
    });

    it('soma no servidor para não perder toque rápido no botão', async () => {
      // Dois cliques em +2,5 antes do primeiro commitar devem virar +5 kg. Isso só vale se o
      // incremento for feito sobre a linha do banco; somar `cargaAtual` (leitura defasada) em
      // JS e gravar o absoluto perde um dos cliques.
      mockQuery.mockResolvedValueOnce(carga('35.00'));
      await fichaService.adjustLoad(7, 'agacho_barra', 30, 2.5);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('exercise_loads.load_kg + $6::numeric');
      expect(sql).toContain('RETURNING load_kg');
      expect(params).toEqual([7, 'agacho_barra', 30, 0, 300, 2.5]);
    });

    it('manda o clamp de 0 a 300 kg para o banco aplicar junto com a soma', async () => {
      mockQuery.mockResolvedValueOnce(carga('0.00'));
      await expect(fichaService.adjustLoad(7, 'elev_lateral', 2.5, -5)).resolves.toBe(0);
      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toContain('LEAST($5::numeric, GREATEST($4::numeric');
    });

    it('cai no cálculo local se o banco falhar, sem derrubar o callback', async () => {
      mockQuery.mockRejectedValueOnce(new Error('deadlock'));
      await expect(fichaService.adjustLoad(7, 'leg_press', 80, 5)).resolves.toBe(85);
    });

    it('também limita o fallback local quando o banco falha', async () => {
      mockQuery.mockRejectedValueOnce(new Error('deadlock'));
      await expect(fichaService.adjustLoad(7, 'leg_press', 298, 5)).resolves.toBe(300);
    });
  });

  describe('completeToday', () => {
    it('grava nas tabelas do Queima Buchinho — streak e relatório continuam certos', async () => {
      await fichaService.completeToday(7);
      expect(workoutService.logWorkout).toHaveBeenCalledWith(7, true, 'Ficha de treino');
      expect(habitsService.markHabit).toHaveBeenCalledWith(7, 'treino', true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ficha_sessions SET completed = TRUE'),
        [7, expect.any(String)]
      );
    });
  });

  describe('completeCardio', () => {
    it('marca o mesmo hábito de cárdio que o menu diário usa', async () => {
      await fichaService.completeCardio(7);
      expect(habitsService.markHabit).toHaveBeenCalledWith(7, 'cardio', true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('cardio_done = TRUE'),
        [7, expect.any(String)]
      );
    });
  });

  describe('saveSession', () => {
    it('guarda a ficha do dia como JSONB idempotente', async () => {
      const ficha = { planKey: 'full_a', data: '2026-09-07', exercicios: [] } as any;
      await fichaService.saveSession(7, ficha);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('ON CONFLICT (user_id, brasilia_date)');
      expect(params).toEqual([7, '2026-09-07', 'full_a', JSON.stringify(ficha)]);
    });
  });
});
