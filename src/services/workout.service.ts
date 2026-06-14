import TelegramBot from 'node-telegram-bot-api';
import { getBrasiliaDateString } from '../utils/time';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { DatabaseError, toError } from '../utils/errors';

export class WorkoutService {
    public async checkDailyMessages(_bot: TelegramBot, targetChatId?: number): Promise<{ trained: boolean; message?: TelegramBot.Message }> {
        try {
            const today = getBrasiliaDateString();
            return { trained: await this.hasWorkoutToday(targetChatId ?? 0, today) };
        } catch (e) {
            logger.error('Erro ao verificar treino:', new DatabaseError(toError(e).message));
            return { trained: false };
        }
    }

    public async hasLoggedToday(userId: number): Promise<boolean> {
        const today = getBrasiliaDateString();
        const { rows } = await query(
            'SELECT 1 FROM workout_logs WHERE user_id = $1 AND brasilia_date = $2 AND trained = true LIMIT 1',
            [userId, today]
        );
        return rows.length > 0;
    }

    private async hasWorkoutToday(id: number, date: string): Promise<boolean> {
        if (id < 0) {
            const { rows } = await query(
                'SELECT 1 FROM workout_logs WHERE brasilia_date = $1 AND trained = true LIMIT 1',
                [date]
            );
            return rows.length > 0;
        }

        const { rows } = await query(
            'SELECT 1 FROM workout_logs WHERE user_id = $1 AND brasilia_date = $2 AND trained = true LIMIT 1',
            [id, date]
        );
        return rows.length > 0;
    }

    public async logWorkout(userId: number, trained: boolean, userMessage?: string): Promise<void> {
        try {
            const today = getBrasiliaDateString();
            // "true vence": um treino confirmado (true) sempre sobrescreve um registro
            // anterior false (ex: a cobrança das 22h marca false antes do Mestre treinar).
            // Assim "fiz treino" SEMPRE persiste e a streak conta certo.
            await query(
                `INSERT INTO workout_logs (user_id, brasilia_date, trained, user_message)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, brasilia_date)
                 DO UPDATE SET
                   trained = workout_logs.trained OR EXCLUDED.trained,
                   user_message = COALESCE(EXCLUDED.user_message, workout_logs.user_message)`,
                [userId, today, trained, userMessage ?? null]
            );
            logger.info(`Treino registrado: user=${userId} data=${today} trained=${trained}`);
        } catch (e) {
            logger.error('Erro ao salvar treino:', new DatabaseError(toError(e).message));
        }
    }

    public async resetWorkout(userId: number): Promise<void> {
        try {
            const today = getBrasiliaDateString();
            await query(
                'DELETE FROM workout_logs WHERE user_id = $1 AND brasilia_date = $2',
                [userId, today]
            );
        } catch (e) {
            logger.error('Erro ao resetar treino:', new DatabaseError(toError(e).message));
        }
    }

    public async getStreak(userId: number): Promise<number> {
        try {
            const { rows } = await query(
                `SELECT brasilia_date FROM workout_logs
                 WHERE user_id = $1 AND trained = true
                 ORDER BY brasilia_date DESC`,
                [userId]
            );
            if (rows.length === 0) return 0;

            let streak = 0;
            const today = getBrasiliaDateString();
            let expected = today;

            for (const row of rows) {
                const date = typeof row.brasilia_date === 'string'
                    ? row.brasilia_date
                    : (row.brasilia_date as Date).toISOString().slice(0, 10);
                if (date === expected) {
                    streak++;
                    const d = new Date(expected + 'T12:00:00-03:00');
                    d.setDate(d.getDate() - 1);
                    expected = d.toISOString().slice(0, 10);
                } else {
                    break;
                }
            }
            return streak;
        } catch (e) {
            logger.error('Erro ao calcular streak:', new DatabaseError(toError(e).message));
            return 0;
        }
    }
}

export const workoutService = new WorkoutService();
