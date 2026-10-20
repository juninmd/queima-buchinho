import { startApi } from './helpers';

const status = { treino: true, cardio: false };
jest.mock('../../src/services/habits.service', () => ({
  habitsService: { getStatus: jest.fn(async () => status), markHabit: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../src/services/workout.service', () => ({
  workoutService: {
    logWorkout: jest.fn().mockResolvedValue(undefined),
    resetWorkout: jest.fn().mockResolvedValue(undefined),
    getStreak: jest.fn().mockResolvedValue(6),
    hasLoggedToday: jest.fn().mockResolvedValue(false),
  },
}));
jest.mock('../../src/services/metrics.service', () => ({
  metricsService: {
    getTodaySum: jest.fn().mockResolvedValue(1200),
    getTodayLatest: jest.fn().mockResolvedValue(5400),
    getLastWeight: jest.fn().mockResolvedValue(82.4),
    getDailySummary: jest.fn().mockResolvedValue({ water: 1200, weight: null, height: 175, body_fat: 14.5, muscle_mass: null }),
  },
}));
jest.mock('../../src/features/pause/pause.service', () => ({
  MAX_PAUSE_DAYS: 30,
  pauseService: { activeUntil: jest.fn().mockResolvedValue('2026-10-22') },
}));

const { habitsService } = jest.requireMock('../../src/services/habits.service');
const { workoutService } = jest.requireMock('../../src/services/workout.service');

describe('estado do dia e hábitos', () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  beforeAll(async () => { api = await startApi(7); });
  afterAll(() => api.close());
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/app/today agrega tudo o que o app precisa', async () => {
    const { status: code, json } = await api.call('GET', '/api/app/today');
    expect(code).toBe(200);
    expect(json.habitDefs).toHaveLength(12);
    expect(json.habitDefs[0]).toEqual({ key: 'treino', emoji: '💪', label: 'Treino', category: 'fitness' });
    expect(json.habits).toEqual(status);
    expect(json.water).toMatchObject({ ml: 1200, goalMl: 2000, celebrationMl: 3000 });
    expect(json.water.paceMl).toBeGreaterThanOrEqual(0);
    expect(json.weight).toBe(82.4); // cai no último peso quando hoje não tem registro
    expect(json.body).toEqual({ height: 175, bodyFat: 14.5, muscleMass: null, steps: 5400 });
    expect(json).toMatchObject({ streak: 6, trained: true, cardioDone: false, pauseUntil: '2026-10-22' });
    expect(json.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('PUT /api/habits/:key marca o hábito e devolve o estado', async () => {
    const res = await api.call('PUT', '/api/habits/leitura', { completed: true });
    expect(res.json).toEqual({ habits: status });
    expect(habitsService.markHabit).toHaveBeenCalledWith(7, 'leitura', true);
    expect(workoutService.logWorkout).not.toHaveBeenCalled();
  });

  it('treino marcado grava workout_logs; desmarcado apaga', async () => {
    await api.call('PUT', '/api/habits/treino', { completed: true });
    expect(workoutService.logWorkout).toHaveBeenCalledWith(7, true, 'App');
    await api.call('PUT', '/api/habits/treino', { completed: false });
    expect(workoutService.resetWorkout).toHaveBeenCalledWith(7);
  });

  it('valida chave e corpo', async () => {
    expect((await api.call('PUT', '/api/habits/inexistente', { completed: true })).status).toBe(404);
    expect((await api.call('PUT', '/api/habits/treino', { completed: 'sim' })).json).toEqual({ error: 'invalid_completed' });
    expect((await api.call('PUT', '/api/habits/treino', [])).json).toEqual({ error: 'invalid_body' });
    expect(habitsService.markHabit).not.toHaveBeenCalled();
  });

  it('POST /api/workout/reset equivale ao /reset', async () => {
    expect((await api.call('POST', '/api/workout/reset')).json).toEqual({ ok: true });
    expect(workoutService.resetWorkout).toHaveBeenCalledWith(7);
    expect(habitsService.markHabit).toHaveBeenCalledWith(7, 'treino', false);
  });
});
