import { progressionService } from '../../src/features/ficha/progression.service';
import { query } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));

const mockQuery = query as jest.Mock;

describe('ProgressionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  describe('getHistory', () => {
    it('reduz o payload da sessão às cargas por exercício', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          data: '2026-09-07',
          payload: { exercicios: [{ key: 'agacho_barra', cargaKg: 30 }, { key: 'prancha', cargaKg: null }] },
        }],
      });
      await expect(progressionService.getHistory(7)).resolves.toEqual([
        { data: '2026-09-07', loads: { agacho_barra: 30, prancha: null }, deload: false },
      ]);
    });

    it('marca a sessão de semana leve para a análise poder ignorá-la', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: '2026-09-07', payload: { deload: true, exercicios: [] } }],
      });
      const [s] = await progressionService.getHistory(7);
      expect(s.deload).toBe(true);
    });

    it('só conta sessão concluída — ficha publicada e não treinada não promove carga', async () => {
      await progressionService.getHistory(7);
      expect(mockQuery.mock.calls[0][0]).toContain('completed = TRUE');
    });

    it('devolve histórico vazio se o banco cair, em vez de derrubar a ficha', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));
      await expect(progressionService.getHistory(7)).resolves.toEqual([]);
    });
  });

  describe('bumpLoads', () => {
    it('não toca no banco quando não há nada para subir', async () => {
      await expect(progressionService.bumpLoads(7, [])).resolves.toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('soma no Postgres, não em memória, e devolve a carga final', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exercise_key: 'agacho_barra', load_kg: '32.50' }] });
      const r = await progressionService.bumpLoads(7, [{ key: 'agacho_barra', cargaKg: 30 }]);
      expect(r).toEqual([{ key: 'agacho_barra', cargaKg: 32.5 }]);
      expect(mockQuery.mock.calls[0][0]).toContain('exercise_loads.load_kg + $4');
    });

    it('degrada sem estourar quando o banco recusa', async () => {
      mockQuery.mockRejectedValueOnce(new Error('deadlock'));
      await expect(progressionService.bumpLoads(7, [{ key: 'agacho_barra', cargaKg: 30 }])).resolves.toEqual([]);
    });
  });

  describe('deload', () => {
    it('continua ativo no último dia da janela', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ate: '2026-09-14' }] });
      await expect(progressionService.isDeloadActive(7, '2026-09-14')).resolves.toBe(true);
    });

    it('expira no dia seguinte ao fim', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ate: '2026-09-14' }] });
      await expect(progressionService.isDeloadActive(7, '2026-09-15')).resolves.toBe(false);
    });

    it('falha de banco não impõe semana leve a quem não pediu', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout'));
      await expect(progressionService.isDeloadActive(7, '2026-09-14')).resolves.toBe(false);
    });

    it('ativa a semana leve contando os dias no próprio banco', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ate: '2026-09-14' }] });
      await expect(progressionService.startDeload(7, '2026-09-07')).resolves.toBe('2026-09-14');
      expect(mockQuery.mock.calls[0][1]).toEqual([7, '2026-09-07', 7]);
    });

    it('devolve null quando não consegue ativar, para o bot não mentir que ativou', async () => {
      mockQuery.mockRejectedValueOnce(new Error('offline'));
      await expect(progressionService.startDeload(7, '2026-09-07')).resolves.toBeNull();
    });
  });
});
