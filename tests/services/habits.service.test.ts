import { pool } from '../../src/config/database';
import { habitsService } from '../../src/services/habits.service';
import { redisService } from '../../src/services/redis.service';
import * as timeUtils from '../../src/utils/time';
import { HABITS } from '../../src/config/habits';

jest.mock('../../src/config/database', () => ({
    pool: {
        query: jest.fn(),
    },
}));

jest.mock('../../src/services/redis.service', () => ({
    redisService: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    },
}));

jest.mock('../../src/utils/time');

describe('HabitsService', () => {
    const userId = 123;
    const today = '2023-10-27';

    beforeEach(() => {
        jest.clearAllMocks();
        (timeUtils.getBrasiliaDateString as jest.Mock).mockReturnValue(today);
    });

    describe('getStatus', () => {
        it('should return cached status if available', async () => {
            const cachedStatus = { treino: true };
            (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedStatus));

            const result = await habitsService.getStatus(userId);

            expect(result).toEqual(cachedStatus);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('should fetch status from DB and cache it if not cached', async () => {
            (redisService.get as jest.Mock).mockResolvedValue(null);
            (pool.query as jest.Mock).mockResolvedValue({
                rows: [{ habit_key: 'treino', completed: true }]
            });

            const result = await habitsService.getStatus(userId);

            expect(result['treino']).toBe(true);
            expect(result['leitura']).toBe(false); // Default value
            expect(redisService.set).toHaveBeenCalledWith(
                `habits:${userId}:${today}`,
                JSON.stringify(result),
                86400
            );
        });

        it('should return default status on DB error', async () => {
            (redisService.get as jest.Mock).mockResolvedValue(null);
            (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await habitsService.getStatus(userId);

            expect(result['treino']).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('toggleHabit', () => {
        it('should toggle habit from false to true', async () => {
            (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify({ treino: false }));
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await habitsService.toggleHabit(userId, 'treino');

            expect(result).toBe(true);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO daily_habits'),
                expect.arrayContaining([userId, today, 'treino', true])
            );
            expect(redisService.del).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should toggle habit from true to false', async () => {
            (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify({ treino: true }));
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await habitsService.toggleHabit(userId, 'treino');

            expect(result).toBe(false);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO daily_habits'),
                expect.arrayContaining([userId, today, 'treino', false])
            );
            consoleSpy.mockRestore();
        });

        it('should handle error during toggle', async () => {
            (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify({ treino: false }));
            (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await habitsService.toggleHabit(userId, 'treino');

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('markHabit', () => {
        it('should mark habit as completed', async () => {
            await habitsService.markHabit(userId, 'treino', true);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO daily_habits'),
                expect.arrayContaining([userId, today, 'treino', true])
            );
            expect(redisService.del).toHaveBeenCalled();
        });

        it('should handle error during markHabit', async () => {
            (pool.query as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await habitsService.markHabit(userId, 'treino', true);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('getCompletedCount', () => {
        it('should return completed and total counts', async () => {
            jest.spyOn(habitsService, 'getStatus').mockResolvedValue({
                treino: true,
                água: true,
                leitura: false
            } as any);

            const result = await habitsService.getCompletedCount(userId);

            expect(result.completed).toBe(2);
            expect(result.total).toBe(HABITS.length);
        });
    });

    describe('getUncompletedHabits', () => {
        it('should return keys of uncompleted habits', async () => {
            const mockStatus: any = {};
            HABITS.forEach(h => mockStatus[h.key] = true);
            mockStatus['treino'] = false;
            mockStatus['leitura'] = false;

            jest.spyOn(habitsService, 'getStatus').mockResolvedValue(mockStatus);

            const result = await habitsService.getUncompletedHabits(userId);

            expect(result).toContain('treino');
            expect(result).toContain('leitura');
            expect(result).not.toContain('água');
        });
    });
});
