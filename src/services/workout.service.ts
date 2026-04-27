import TelegramBot from 'node-telegram-bot-api';
import { getBrasiliaDayStart, getBrasiliaDateString } from '../utils/time';
import { WORKOUT_KEYWORDS } from '../config/constants';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export class WorkoutService {
    public async checkDailyMessages(bot: TelegramBot, targetChatId?: number): Promise<{ trained: boolean; message?: TelegramBot.Message }> {
        try {
            const today = getBrasiliaDateString();
            const alreadyLogged = await this.hasWorkoutToday(targetChatId ?? 0, today);
            if (alreadyLogged) return { trained: true };

            // Se estivermos em modo Webhook, getUpdates NÃO PODE ser usado (Gera erro 409)
            if (process.env.WEBHOOK_URL) {
                logger.warn('[WorkoutService] getUpdates ignorado: Webhook está ativo. Confiando apenas no banco de dados.');
                return { trained: false };
            }

            const updates = await bot.getUpdates({ limit: 100 });
            const todayStart = getBrasiliaDayStart();
            let trainedMessage: TelegramBot.Message | undefined;

            for (const update of updates) {
                const msg = update.message;
                if (!msg) continue;
                if (targetChatId && msg.chat.id !== targetChatId && msg.from?.id !== targetChatId) continue;
                if (new Date(msg.date * 1000) >= todayStart && this.hasWorkoutKeyword(msg.text || '')) {
                    trainedMessage = msg;
                }
            }

            return { trained: !!trainedMessage, message: trainedMessage };
        } catch (error) {
            logger.error('Erro ao verificar mensagens:', error);
            return { trained: false };
        }
    }

    public async hasLoggedToday(userId: number): Promise<boolean> {
        const today = getBrasiliaDateString();
        const { rows } = await pool.query(
            'SELECT 1 FROM workout_logs WHERE user_id = $1 AND brasilia_date = $2 AND trained = true LIMIT 1',
            [userId, today]
        );
        return rows.length > 0;
    }

    private async hasWorkoutToday(id: number, date: string): Promise<boolean> {
        // Se for um ID de grupo (negativo), verificamos se QUALQUER pessoa treinou hoje
        if (id < 0) {
            const { rows } = await pool.query(
                'SELECT 1 FROM workout_logs WHERE brasilia_date = $1 AND trained = true LIMIT 1',
                [date]
            );
            return rows.length > 0;
        }

        const { rows } = await pool.query(
            'SELECT 1 FROM workout_logs WHERE user_id = $1 AND brasilia_date = $2 AND trained = true LIMIT 1',
            [id, date]
        );
        return rows.length > 0;
    }

    private hasWorkoutKeyword(text: string): boolean {
        return WORKOUT_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
    }

    public async logWorkout(userId: number, trained: boolean, userMessage?: string): Promise<void> {
        try {
            const today = getBrasiliaDateString();
            await pool.query(
                `INSERT INTO workout_logs (user_id, brasilia_date, trained, user_message)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, brasilia_date) DO NOTHING`,
                [userId, today, trained, userMessage ?? null]
            );
            logger.info(`📝 Treino registrado: user=${userId} data=${today} trained=${trained}`);
        } catch (error) {
            logger.error('Erro ao salvar treino:', error);
        }
    }

    public async resetWorkout(userId: number): Promise<void> {
        try {
            const today = getBrasiliaDateString();
            await pool.query(
                'DELETE FROM workout_logs WHERE user_id = $1 AND brasilia_date = $2',
                [userId, today]
            );
        } catch (error) {
            logger.error('Erro ao resetar treino:', error);
        }
    }

    public async getStreak(userId: number): Promise<number> {
        try {
            const { rows } = await pool.query(
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
        } catch (error) {
            logger.error('Erro ao calcular streak:', error);
            return 0;
        }
    }
}

export const workoutService = new WorkoutService();
