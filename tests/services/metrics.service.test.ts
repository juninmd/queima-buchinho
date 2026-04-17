import { metricsService } from '../../src/services/metrics.service';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
    pool: {
        query: jest.fn()
    }
}));

describe('MetricsService', () => {
    const mockQuery = pool.query as jest.Mock;
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

            expect(summary.water).toBe(0);
            expect(summary.weight).toBeNull();
        });
    });
});


