import { dashboardService } from '../../src/services/dashboard.service';
import { query } from '../../src/config/database';
import { HABITS } from '../../src/config/habits';
import { getBrasiliaDateString } from '../../src/utils/time';

jest.mock('../../src/config/database', () => ({
    query: jest.fn(),
    pool: { end: jest.fn() },
}));
jest.mock('../../src/services/redis.service', () => ({
    redisService: { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn(), isConnected: () => false },
}));

describe('DashboardService.getSeries', () => {
    const mockQuery = query as jest.Mock;
    const userId = 42;
    const today = getBrasiliaDateString();

    beforeEach(() => jest.clearAllMocks());

    it('should use the full habit catalog as habitsTotal and last weight of the day', async () => {
        mockQuery.mockImplementation((sql: string) => {
            if (sql.includes('FROM user_metrics')) {
                expect(sql).toMatch(/CASE WHEN type = 'weight'/);
                return Promise.resolve({ rows: [
                    { brasilia_date: today, type: 'water', total: '1500' },
                    { brasilia_date: today, type: 'weight', total: '80.5' },
                ] });
            }
            if (sql.includes('FROM workout_logs')) {
                return Promise.resolve({ rows: [{ brasilia_date: today, trained: true }] });
            }
            // Só 3 hábitos tocados no dia (2 feitos): total NÃO pode ser 3.
            return Promise.resolve({ rows: [{ brasilia_date: today, completed: '2' }] });
        });

        const series = await dashboardService.getSeries(userId, 2);
        const [yesterday, todayPoint] = series;

        expect(series).toHaveLength(2);
        expect(todayPoint).toEqual({
            date: today, water: 1500, weight: 80.5, trained: true,
            habitsCompleted: 2, habitsTotal: HABITS.length,
        });
        expect(yesterday).toEqual(expect.objectContaining({
            water: 0, weight: null, trained: false, habitsCompleted: 0, habitsTotal: HABITS.length,
        }));
    });

    it('should return an empty series on query error', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));
        const spy = jest.spyOn(console, 'error').mockImplementation();

        expect(await dashboardService.getSeries(userId, 7)).toEqual([]);
        spy.mockRestore();
    });
});
