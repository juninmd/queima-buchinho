import { metricsService } from '../../src/services/metrics.service';
import { query } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
    query: jest.fn(),
    pool: { end: jest.fn() },
}));

jest.mock('../../src/services/redis.service', () => ({
    redisService: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) },
}));

describe('MetricsService', () => {
    const mockQuery = query as jest.Mock;
    const userId = 123456;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logMetric', () => {
        it('should log a body metric successfully', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            
            await metricsService.logMetric(userId, 'height', 180, 'cm');
            
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO user_metrics'),
                [userId, 'height', 180, 'cm', expect.any(String)]
            );
        });
    });

    describe('getDailySummary', () => {
        it('should consolidate daily data correctly', async () => {
            mockQuery.mockImplementation((query, params) => {
                if (query.includes("GROUP BY type")) {
                    return Promise.resolve({ 
                        rows: [
                            { type: 'water', total: '2000' },
                            { type: 'weight', total: '80' }
                        ] 
                    });
                }
                const type = params[1];
                if (type === 'height') return Promise.resolve({ rows: [{ value: 180 }] });
                if (type === 'muscle_mass') return Promise.resolve({ rows: [{ value: 40 }] });
                if (type === 'body_fat') return Promise.resolve({ rows: [{ value: 20 }] });
                return Promise.resolve({ rows: [] });
            });
            
            const summary = await metricsService.getDailySummary(userId);

            expect(summary).toEqual({
                water: 2000,
                weight: 80,
                height: 180,
                muscle_mass: 40,
                body_fat: 20
            });
        });


        it('should handle missing data by returning 0 or null', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const summary = await metricsService.getDailySummary(userId);

            expect(summary!.water).toBe(0);
            expect(summary!.weight).toBeNull();
        });

        it('should return null on query error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('db error'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            const summary = await metricsService.getDailySummary(userId);
            expect(summary).toBeNull();
            spy.mockRestore();
        });
    });

    describe('getTodaySum', () => {
        it('should return sum of metric for today', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ total: '1500' }] });
            const result = await metricsService.getTodaySum(userId, 'water');
            expect(result).toBe(1500);
        });

        it('should return 0 on empty result', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ total: null }] });
            const result = await metricsService.getTodaySum(userId, 'water');
            expect(result).toBe(0);
        });

        it('should return 0 on error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            const result = await metricsService.getTodaySum(userId, 'water');
            expect(result).toBe(0);
            spy.mockRestore();
        });
    });

    describe('getLatestValue', () => {
        it('should return latest value', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ value: '75.5' }] });
            const result = await metricsService.getLatestValue(userId, 'weight');
            expect(result).toBe(75.5);
        });

        it('should return null if no rows', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const result = await metricsService.getLatestValue(userId, 'weight');
            expect(result).toBeNull();
        });
    });

    describe('getWeightDiffFromStart', () => {
        it('should return difference between first and last weight', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ value: '70' }, { value: '75' }, { value: '73' }] });
            const diff = await metricsService.getWeightDiffFromStart(userId);
            expect(diff).toBe(3);
        });

        it('should return 0 if less than 2 records', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ value: '70' }] });
            const diff = await metricsService.getWeightDiffFromStart(userId);
            expect(diff).toBe(0);
        });

        it('should return 0 on error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            const diff = await metricsService.getWeightDiffFromStart(userId);
            expect(diff).toBe(0);
            spy.mockRestore();
        });
    });

    describe('getWeeklySummary', () => {
        it('should return weekly summary from DB', async () => {
            mockQuery.mockResolvedValue({ rows: [{ type: 'water', total: '10000' }, { type: 'weight', total: '80' }] });
            // currentWorkouts and previousWorkouts queries return count rows
            mockQuery
                .mockResolvedValueOnce({ rows: [{ type: 'water', total: '5000' }] })  // currentMetrics
                .mockResolvedValueOnce({ rows: [{ type: 'water', total: '4000' }] })  // previousMetrics
                .mockResolvedValueOnce({ rows: [{ total: '3' }] })                    // currentWorkouts
                .mockResolvedValueOnce({ rows: [{ total: '2' }] });                   // previousWorkouts

            const summary = await metricsService.getWeeklySummary(userId);
            expect(summary).not.toBeNull();
            expect(summary!.current.workouts).toBe(3);
            expect(summary!.previous.workouts).toBe(2);
        });

        it('should return null on error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            const summary = await metricsService.getWeeklySummary(userId);
            expect(summary).toBeNull();
            spy.mockRestore();
        });
    });

    describe('logMetric - error handling', () => {
        it('should handle DB error gracefully', async () => {
            mockQuery.mockRejectedValueOnce(new Error('insert fail'));
            const spy = jest.spyOn(console, 'error').mockImplementation();
            await expect(metricsService.logMetric(userId, 'weight', 80, 'kg')).resolves.toBeUndefined();
            spy.mockRestore();
        });
    });
});


