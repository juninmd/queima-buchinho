import { workoutService } from '../src/services/workout.service';
import { query } from '../src/config/database';
import { getBrasiliaDateString } from '../src/utils/time';
import TelegramBot from 'node-telegram-bot-api';

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    pool: { end: jest.fn() },
}));

describe('WorkoutService', () => {
    const mockQuery = query as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkDailyMessages', () => {
        let bot: jest.Mocked<TelegramBot>;

        beforeEach(() => {
            bot = {
                getUpdates: jest.fn()
            } as any;
        });

        it('should return trained: true if already logged today', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
            
            const result = await workoutService.checkDailyMessages(bot, 123);
            
            expect(result.trained).toBe(true);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT 1 FROM workout_logs'),
                [123, expect.any(String)]
            );
            expect(bot.getUpdates).not.toHaveBeenCalled();
        });

        it('should not infer trained from recent message keywords', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] }); // Not logged
            bot.getUpdates.mockResolvedValueOnce([
                {
                    message: {
                        chat: { id: 123 },
                        from: { id: 123 },
                        text: 'hoje eu treinei pesado',
                        date: Math.floor(Date.now() / 1000)
                    }
                }
            ] as any);

            const result = await workoutService.checkDailyMessages(bot, 123);

            expect(result.trained).toBe(false);
            expect(bot.getUpdates).not.toHaveBeenCalled();
        });

        it('should return trained: false if no keyword found in recent messages', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            bot.getUpdates.mockResolvedValueOnce([
                {
                    message: {
                        chat: { id: 123 },
                        from: { id: 123 },
                        text: 'comi pizza',
                        date: Math.floor(Date.now() / 1000)
                    }
                }
            ] as any);

            const result = await workoutService.checkDailyMessages(bot, 123);

            expect(result.trained).toBe(false);
        });

        it('should handle targetChatId mismatch', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            bot.getUpdates.mockResolvedValueOnce([
                {
                    message: {
                        chat: { id: 456 }, // Different chat
                        from: { id: 456 },
                        text: 'treinei',
                        date: Math.floor(Date.now() / 1000)
                    }
                }
            ] as any);

            const result = await workoutService.checkDailyMessages(bot, 123);

            expect(result.trained).toBe(false);
        });

        it('should skip updates without message', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            bot.getUpdates.mockResolvedValueOnce([
                { callback_query: {} }
            ] as any);

            const result = await workoutService.checkDailyMessages(bot, 123);

            expect(result.trained).toBe(false);
        });

        it('should handle errors and return trained: false', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB Error'));
            
            const result = await workoutService.checkDailyMessages(bot, 123);
            
            expect(result.trained).toBe(false);
        });
    });

    describe('logWorkout', () => {
        it('should log workout successfully', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            
            await workoutService.logWorkout(123, true, 'treinei');
            
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO workout_logs'),
                [123, expect.any(String), true, 'treinei']
            );
        });

        it('should handle logWorkout errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockQuery.mockRejectedValueOnce(new Error('DB Error'));
            
            await workoutService.logWorkout(123, true);
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('salvar treino'));
            consoleSpy.mockRestore();
        });
    });

    describe('resetWorkout', () => {
        it('should delete workout record', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            
            await workoutService.resetWorkout(123);
            
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM workout_logs'),
                [123, expect.any(String)]
            );
        });

        it('should handle resetWorkout errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockQuery.mockRejectedValueOnce(new Error('DB Error'));
            
            await workoutService.resetWorkout(123);
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('resetar treino'));
            consoleSpy.mockRestore();
        });
    });

    describe('getStreak', () => {
        const today = getBrasiliaDateString();
        const daysAgo = (n: number) => {
            const d = new Date(today + 'T12:00:00-03:00');
            d.setDate(d.getDate() - n);
            return d.toISOString().slice(0, 10);
        };
        const rowsFor = (dates: string[]) => ({ rows: dates.map(brasilia_date => ({ brasilia_date })) });

        it('should count consecutive days ending today', async () => {
            mockQuery.mockResolvedValueOnce(rowsFor([today, daysAgo(1), daysAgo(2)]));
            expect(await workoutService.getStreak(123)).toBe(3);
        });

        it('should keep the streak alive when today is not logged yet', async () => {
            mockQuery.mockResolvedValueOnce(rowsFor([daysAgo(1), daysAgo(2)]));
            expect(await workoutService.getStreak(123)).toBe(2);
        });

        it('should break the streak after a missed day', async () => {
            mockQuery.mockResolvedValueOnce(rowsFor([today, daysAgo(2), daysAgo(3)]));
            expect(await workoutService.getStreak(123)).toBe(1);
        });

        it('should return 0 when the last workout was two days ago', async () => {
            mockQuery.mockResolvedValueOnce(rowsFor([daysAgo(2), daysAgo(3)]));
            expect(await workoutService.getStreak(123)).toBe(0);
        });

        it('should accept Date objects from pg', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ brasilia_date: new Date(today + 'T12:00:00Z') }] });
            expect(await workoutService.getStreak(123)).toBe(1);
        });

        it('should return 0 when there are no rows', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });
            expect(await workoutService.getStreak(123)).toBe(0);
        });
    });
});
