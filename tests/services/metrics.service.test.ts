import { pool } from '../../src/config/database';
import { metricsService } from '../../src/services/metrics.service';
import * as timeUtils from '../../src/utils/time';

jest.mock('../../src/config/database', () => ({
    pool: {
        query: jest.fn(),
    },
}));

jest.mock('../../src/utils/time');

describe('MetricsService', () => {
    const userId = 123;
    const today = '2023-10-27';

    beforeEach(() => {
        jest.clearAllMocks();
        (timeUtils.getBrasiliaDateString as jest.Mock).mockReturnValue(today);
    });

    describe('logMetric', () => {
        it('should insert a metric successfully', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            await metricsService.logMetric(userId, 'water', 250, 'ml');

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_metrics'),
                [userId, 'water', 250, 'ml', today]
            );
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 Métrica registrada'));
            consoleSpy.mockRestore();
        });

        it('should handle insert error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await metricsService.logMetric(userId, 'water', 250);

            expect(consoleSpy).toHaveBeenCalledWith('Erro ao salvar métrica:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('getTodaySum', () => {
        it('should return the sum of metrics for today', async () => {
            (pool.query as jest.Mock).mockResolvedValue({ rows: [{ total: '500' }] });

            const result = await metricsService.getTodaySum(userId, 'water');

            expect(result).toBe(500);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT SUM(value)'),
                [userId, 'water', today]
            );
        });

        it('should return 0 if no metrics found', async () => {
            (pool.query as jest.Mock).mockResolvedValue({ rows: [{ total: null }] });
            const result = await metricsService.getTodaySum(userId, 'water');
            expect(result).toBe(0);
        });

        it('should handle query error and return 0', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const result = await metricsService.getTodaySum(userId, 'water');

            expect(result).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao buscar soma de water:'), expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('getLastWeight', () => {
        it('should return the last weight entry', async () => {
            (pool.query as jest.Mock).mockResolvedValue({ rows: [{ value: '85.5' }] });

            const result = await metricsService.getLastWeight(userId);

            expect(result).toBe(85.5);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining("WHERE user_id = $1 AND type = 'weight'"),
                [userId]
            );
        });

        it('should return null if no weight entries found', async () => {
            (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
            const result = await metricsService.getLastWeight(userId);
            expect(result).toBeNull();
        });

        it('should handle query error and return null', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const result = await metricsService.getLastWeight(userId);

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Erro ao buscar último peso:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('getWeightDiffFromStart', () => {
        it('should return the difference between first and last weight', async () => {
            (pool.query as jest.Mock).mockResolvedValue({
                rows: [
                    { value: '90.0' },
                    { value: '88.5' },
                    { value: '85.0' }
                ]
            });

            const result = await metricsService.getWeightDiffFromStart(userId);

            expect(result).toBe(-5.0); // 85.0 - 90.0
        });

        it('should return 0 if less than 2 weight entries found', async () => {
            (pool.query as jest.Mock).mockResolvedValue({ rows: [{ value: '90.0' }] });
            const result = await metricsService.getWeightDiffFromStart(userId);
            expect(result).toBe(0);
        });

        it('should handle query error and return 0', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const result = await metricsService.getWeightDiffFromStart(userId);

            expect(result).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith('Erro ao calcular diferença de peso:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('getWeeklySummary', () => {
        it('should return a weekly summary', async () => {
            (pool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ type: 'water', total: '2000' }, { type: 'weight', total: '85' }] }) // currentMetrics
                .mockResolvedValueOnce({ rows: [{ type: 'water', total: '1500' }] }) // previousMetrics
                .mockResolvedValueOnce({ rows: [{ total: '3' }] }) // currentWorkouts
                .mockResolvedValueOnce({ rows: [{ total: '4' }] }); // previousWorkouts

            const result = await metricsService.getWeeklySummary(userId);

            expect(result).toEqual({
                current: {
                    metrics: { water: 2000, weight: 85 },
                    workouts: 3
                },
                previous: {
                    metrics: { water: 1500, weight: 0 },
                    workouts: 4
                }
            });
        });

        it('should handle error and return null', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const result = await metricsService.getWeeklySummary(userId);

            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Erro ao gerar resumo semanal:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });
});
