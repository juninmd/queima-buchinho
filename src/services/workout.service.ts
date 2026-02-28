import * as fs from 'fs';
import * as path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import { getBrasiliaDayStart, getBrasiliaDateString } from '../utils/time';
import { WORKOUT_KEYWORDS } from '../config/constants';

const HISTORY_FILE = path.join(__dirname, '../../data/workout-history.json');

interface WorkoutLogEntry {
    date: string;
    userId: number;
    userMessage: string;
}

export class WorkoutService {
    public async checkDailyMessages(bot: TelegramBot): Promise<{ trained: boolean; message?: TelegramBot.Message }> {
        try {
            const updates = await bot.getUpdates({ limit: 100 });
            const todayStart = getBrasiliaDayStart();
            let trainedMessage: TelegramBot.Message | undefined;

            for (const update of updates) {
                if (update.message) {
                    const msg = update.message;
                    const msgDate = new Date(msg.date * 1000);

                    if (msgDate >= todayStart && this.hasWorkoutKeyword(msg.text || '')) {
                        trainedMessage = msg;
                    }
                }
            }

            return { trained: !!trainedMessage, message: trainedMessage };
        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
            return { trained: false };
        }
    }

    private hasWorkoutKeyword(text: string): boolean {
        const lowerText = text.toLowerCase();
        return WORKOUT_KEYWORDS.some((kw) => lowerText.includes(kw));
    }

    public logWorkout(userId: number, userMessage: string) {
        try {
            const dataDir = path.dirname(HISTORY_FILE);
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

            let history: WorkoutLogEntry[] = [];
            if (fs.existsSync(HISTORY_FILE)) {
                history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
            }

            const todayDateString = getBrasiliaDateString();
            if (history.some((h) => h.userId === userId && h.date.startsWith(todayDateString))) {
                return;
            }

            history.push({ date: new Date().toISOString(), userId, userMessage });
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    public resetWorkout(userId: number) {
        try {
            if (fs.existsSync(HISTORY_FILE)) {
                const history: WorkoutLogEntry[] = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
                const todayDateString = getBrasiliaDateString();
                const filtered = history.filter((h) => !(h.userId === userId && h.date.startsWith(todayDateString)));
                fs.writeFileSync(HISTORY_FILE, JSON.stringify(filtered, null, 2));
            }
        } catch (error) {
            console.error('Erro ao resetar histórico:', error);
        }
    }
}

export const workoutService = new WorkoutService();

