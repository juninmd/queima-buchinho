import TelegramBot from 'node-telegram-bot-api';
import { getBrasiliaDayStart, getBrasiliaDateString } from '../utils/time';
import { WORKOUT_KEYWORDS } from '../config/constants';
import { pool } from '../config/database';

export class WorkoutService {
    public async checkDailyMessages(bot: TelegramBot, targetChatId?: number): Promise<{ trained: boolean; message?: TelegramBot.Message }> {
        try {
            const today = getBrasiliaDateString();
            const alreadyLogged = await this.hasWorkoutToday(targetChatId ?? 0, today);
            if (alreadyLogged) return { trained: true };

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
            console.error('Erro ao verificar mensagens:', error);
            return { trained: false };
        }
    }

    private async hasWorkoutToday(userId: number, date: string): Promise<boolean> {
        const { rows } = await pool.query(
            'SELECT 1 FROM workout_logs WHERE user_id = $1 AND brasilia_date = $2 LIMIT 1',
            [userId, date]
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
            console.log(`📝 Treino registrado: user=${userId} data=${today} trained=${trained}`);
        } catch (error) {
            console.error('Erro ao salvar treino:', error);
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
            console.error('Erro ao resetar treino:', error);
        }
    }
}

export const workoutService = new WorkoutService();
