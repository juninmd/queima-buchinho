import { startApi } from './helpers';

const ficha = {
  planKey: 'upper_a', titulo: 'Superior', exercicios: [
    { key: 'puxada_frontal', nome: 'Puxada', cargaKg: 50 },
    { key: 'prancha', nome: 'Prancha', cargaKg: null },
  ],
};
jest.mock('../../src/features/ficha/ficha.service', () => ({
  fichaService: {
    buildToday: jest.fn(async () => ficha),
    adjustLoad: jest.fn(async () => 52.5),
    saveSession: jest.fn().mockResolvedValue(undefined),
    completeToday: jest.fn().mockResolvedValue(undefined),
    completeCardio: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../src/services/habits.service', () => ({
  habitsService: { getStatus: jest.fn(async () => ({ cafe: true, cardio: true })) },
}));
jest.mock('../../src/services/workout.service', () => ({
  workoutService: { hasLoggedToday: jest.fn().mockResolvedValue(true) },
}));

const { fichaService } = jest.requireMock('../../src/features/ficha/ficha.service');

describe('ficha e cardápio', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => { api = await startApi(7); });
  afterAll(() => api.close());
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/ficha devolve a ficha e o status do dia', async () => {
    const { json } = await api.call('GET', '/api/ficha');
    expect(json).toMatchObject({ ficha: { planKey: 'upper_a' }, trained: true, cardioDone: true });
  });

  it('dia de descanso devolve ficha null', async () => {
    fichaService.buildToday.mockResolvedValueOnce(null);
    expect((await api.call('GET', '/api/ficha')).json.ficha).toBeNull();
  });

  it('ajusta carga e persiste a sessão', async () => {
    const res = await api.call('POST', '/api/ficha/loads', { exerciseKey: 'puxada_frontal', delta: 2.5 });
    expect(res.json).toEqual({ loadKg: 52.5 });
    expect(fichaService.adjustLoad).toHaveBeenCalledWith(7, 'puxada_frontal', 50, 2.5);
    expect(fichaService.saveSession).toHaveBeenCalled();
  });

  it('rejeita delta fora do passo, exercício fora da ficha e sem carga', async () => {
    expect((await api.call('POST', '/api/ficha/loads', { exerciseKey: 'puxada_frontal', delta: 1 })).json).toEqual({ error: 'invalid_delta' });
    expect((await api.call('POST', '/api/ficha/loads', { exerciseKey: 'outro', delta: 5 })).json).toEqual({ error: 'invalid_exerciseKey' });
    expect((await api.call('POST', '/api/ficha/loads', { exerciseKey: 'prancha', delta: 5 })).status).toBe(400);
    expect((await api.call('POST', '/api/ficha/loads', { delta: 5 })).json).toEqual({ error: 'invalid_exerciseKey' });
    expect(fichaService.adjustLoad).not.toHaveBeenCalled();
  });

  it('conclui treino e cárdio', async () => {
    expect((await api.call('POST', '/api/ficha/done')).json).toEqual({ trained: true });
    expect((await api.call('POST', '/api/ficha/cardio')).json).toEqual({ cardioDone: true });
    expect(fichaService.completeToday).toHaveBeenCalledWith(7);
    expect(fichaService.completeCardio).toHaveBeenCalledWith(7);
  });

  it('GET /api/diet lista as 4 refeições com o estado de cada uma', async () => {
    const { json } = await api.call('GET', '/api/diet');
    expect(json.meals.map((m: { key: string }) => m.key)).toEqual(['cafe', 'almoco', 'cafe_tarde', 'jantar']);
    expect(json.meals[0]).toMatchObject({ done: true });
    expect(json.meals[1].done).toBe(false);
    expect(json.meals[0].text.length).toBeGreaterThan(10);
  });
});
