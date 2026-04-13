import { workoutService } from '../src/services/workout.service';
import { pool } from '../src/config/database';
import TelegramBot from 'node-telegram-bot-api';

// Mock database pool
jest.mock('../src/config/database', () => ({
    pool: {
        query: jest.fn()
    }
}));

describe('WorkoutService', () => {
    const mockQuery = pool.query as jest.Mock;

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

        it('should return trained: true if keyword found in recent messages', async () => {
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

            expect(result.trained).toBe(true);
            expect(result.message?.text).toBe('hoje eu treinei pesado');
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
            
            expect(consoleSpy).toHaveBeenCalledWith('Erro ao salvar treino:', expect.any(Error));
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
            
            expect(consoleSpy).toHaveBeenCalledWith('Erro ao resetar treino:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });
});
