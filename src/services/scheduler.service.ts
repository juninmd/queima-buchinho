import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from './workout.service';
import { memeService } from './meme.service';
import { habitsService } from './habits.service';
import { ollamaService } from './ollama.service';
import { myInstantsService } from './myinstants.service';
import { ttsService } from './tts.service';
import { metricsService } from './metrics.service';
import { sendAudioMessage } from '../utils/telegram';
import { HABIT_MAP } from '../config/habits';
import { redisService } from './redis.service';
import { logger } from '../utils/logger';
import { DIET_PLAN } from '../config/diet';
import { getBrasiliaDayName } from '../utils/time';

const TRAIN_BTN: TelegramBot.InlineKeyboardButton = { text: '🏋️‍♂️ Já treinei! ✅', callback_data: 'mark_trained' };
const CARDIO_BTN: TelegramBot.InlineKeyboardButton = { text: '🏃 Cárdio feito! ✅', callback_data: 'mark_cardio' };
const WATER_ROW: TelegramBot.InlineKeyboardButton[] = [
    { text: '🥤 +250ml', callback_data: 'add_water_250' },
    { text: '🥛 +500ml', callback_data: 'add_water_500' }
];

export class SchedulerService {
    private bot: TelegramBot;
    constructor(bot: TelegramBot) { this.bot = bot; }

    private async withLock(lockKey: string, task: () => Promise<void>, ttlSeconds = 600) {
        const lock = await redisService.get(lockKey);
        if (lock) {
            logger.warn(`[Scheduler] Job ${lockKey} já está em execução. Pulando.`);
            return;
        }

        try {
            await redisService.set(lockKey, 'locked', ttlSeconds);
            await task();
        } catch (error) {
            logger.error(`[Scheduler] Erro ao executar ${lockKey}:`, error);
        } finally {
            await redisService.del(lockKey);
        }
    }

    private getChatId(): number | null {
        const chatIdStr = process.env.CHAT_ID;
        if (!chatIdStr) {
            logger.error('❌ CHAT_ID não definido.');
            return null;
        }
        return Number(chatIdStr);
    }

    private async sendWithAudio(chatId: number, response: { message: string; audioSearchTerm?: string }, options?: TelegramBot.SendMessageOptions) {
        try {
            const audioPath = await ttsService.generateMikaAudio(response.message);
            await sendAudioMessage(this.bot, chatId, audioPath, response.message, options);
            await ttsService.cleanup(audioPath);
        } catch (e) {
            logger.error('[Scheduler] Erro ao gerar TTS:', e);
            await this.bot.sendMessage(chatId, response.message, options);
        }

        // Se tiver termo de áudio (ou se for falha), tentar enviar MyInstants também
        if (response.audioSearchTerm) {
            try {
                const instant = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
                if (instant?.audioUrl) {
                    await this.bot.sendAudio(chatId, instant.audioUrl, { caption: `🎶 ${instant.title}` });
                }
            } catch (err) {
                logger.error('[Scheduler] Erro ao enviar áudio do MyInstants:', err);
            }
        }
    }

    public async runDailyCheck() {
        await this.withLock('lock:daily_check', async () => {
            logger.info('⏰ Executando verificação diária...');
            const chatId = this.getChatId();
            if (!chatId) return;

            const { trained, message } = await workoutService.checkDailyMessages(this.bot, chatId);
            const trainingMsgText = message?.text || '';

            if (trained) {
                logger.info('✅ Usuário treinou hoje!');
                workoutService.logWorkout(chatId, true, trainingMsgText);
                await this.sendWithAudio(chatId, await memeService.getCongratsMessage());
                return;
            }

            logger.info('❌ Usuário não treinou hoje.');
            workoutService.logWorkout(chatId, false);
            const roast = await memeService.getRoastMessage();
            // Adicionando termo de áudio para falha se não houver
            if (!roast.audioSearchTerm) roast.audioSearchTerm = 'triste';
            await this.sendWithAudio(chatId, roast, { reply_markup: { inline_keyboard: [[TRAIN_BTN, CARDIO_BTN]] } });
        });
    }
    public async sendMorningReminder() {
        await this.withLock('lock:morning_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            const dayName = getBrasiliaDayName();
            const diet = DIET_PLAN[dayName] || DIET_PLAN['segunda-feira'];

            logger.info(`⏰ Enviando lembrete matinal de ${dayName}...`);
            let msg = `<b>Bom dia, Majestade!</b>\n\n`;
            msg += `🍴 <b>Cardápio de hoje (${dayName}):</b>\n`;
            msg += `🍳 Café: ${diet.cafe}\n`;
            msg += `🍽️ Almoço: ${diet.almoco}\n`;
            msg += `🌙 Jantar: ${diet.jantar}\n\n`;
            msg += `Bora dominar o mundo? 🌍`;

            await this.bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
            await this.sendWithAudio(chatId, await memeService.getMorningReminder(dayName));
            
            const MenuController = (await import('../controllers/menu.controller')).MenuController;
            const menu = new MenuController(this.bot);
            await menu.showMenuToUser(chatId, chatId);
        });
    }

    public async sendConditionalReminder() {
        await this.withLock('lock:conditional_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('⏰ Verificando treino para cobrança...');
            try {
                const { trained } = await workoutService.checkDailyMessages(this.bot, chatId);
                if (!trained) {
                    const hour = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit' });
                    logger.info(`❌ Usuário não treinou. Enviando cobrança das ${hour}:00...`);
                    const roast = await memeService.getConditionalReminder(`${hour}:00`);
                    if (!roast.audioSearchTerm) roast.audioSearchTerm = 'sad trombone';
                    await this.sendWithAudio(chatId, roast, { reply_markup: { inline_keyboard: [[TRAIN_BTN, CARDIO_BTN]] } });
                } else {
                    logger.info('✅ Usuário já treinou hoje. Pulando cobrança.');
                }
            } catch (error) {
                logger.error('❌ Erro ao verificar treino na cobrança:', error);
            }
        });
    }

    public async sendWaterReminder() {
        await this.withLock('lock:water_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('💧 Enviando lembrete de água...');
            const options: TelegramBot.SendMessageOptions = {
                reply_markup: { inline_keyboard: [WATER_ROW, [{ text: '🍼 +1L', callback_data: 'add_water_1000' }]] }
            };
            const reminder = await memeService.getWaterReminder();
            if (!reminder.audioSearchTerm) reminder.audioSearchTerm = 'beber agua';
            await this.sendWithAudio(chatId, reminder, options);
        });
    }

    public async sendFoodReminder(meal: 'cafe' | 'almoco' | 'jantar') {
        await this.withLock(`lock:food_reminder_${meal}`, async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            const habit = HABIT_MAP.get(meal);
            const label = habit?.emoji ? `${habit.emoji} ${habit.label}` : meal;
            const dayName = getBrasiliaDayName();
            const diet = DIET_PLAN[dayName] || DIET_PLAN['segunda-feira'];
            const mealDescription = diet[meal];

            logger.info(`🍽️ Enviando lembrete de ${meal}...`);
            const options: TelegramBot.SendMessageOptions = {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `✅ Já ${label}!`, callback_data: `meal_done_${meal}` }],
                        [TRAIN_BTN, CARDIO_BTN],
                        WATER_ROW
                    ]
                }
            };

            const reminder = await memeService.getFoodReminder(meal);
            reminder.message = `<b>${label}:</b>\n${mealDescription}\n\n${reminder.message}`;
            if (!reminder.audioSearchTerm) reminder.audioSearchTerm = 'comer';

            await this.sendWithAudio(chatId, reminder, options);
        });
    }

    public async sendHabitsCheckReminder() {
        await this.withLock('lock:habits_check', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('📋 Enviando verificação de hábitos do dia...');
            try {
                const uncompleted = await habitsService.getUncompletedHabits(chatId);
                if (uncompleted.length === 0) {
                    const allDone = await ollamaService.generateDynamicResponse('O Mestre completou todos os hábitos do dia. Elogie de forma curta e genuína.');
                    const msg = allDone?.message ?? 'Todos os hábitos feitos hoje. Tá pago, Lenda. 💜';
                    await this.sendWithAudio(chatId, { message: msg });
                    return;
                }

                const labels = uncompleted.map(key => {
                    const h = HABIT_MAP.get(key);
                    return h ? `${h.emoji} ${h.label}` : key;
                });

                const response = await ollamaService.getHabitsCheckReminder(labels);
                const msg = response?.message ?? `Faltam ${uncompleted.length} hábitos hoje: ${labels.join(', ')}`;

                const keyboard = uncompleted.slice(0, 4).reduce<TelegramBot.InlineKeyboardButton[][]>((rows, key, i) => {
                    const h = HABIT_MAP.get(key);
                    const btn = { text: `${h?.emoji || '✅'} ${h?.label || key}`, callback_data: `habit_${key}` };
                    i % 2 === 0 ? rows.push([btn]) : rows[rows.length - 1].push(btn);
                    return rows;
                }, []);

                await this.sendWithAudio(chatId, { message: msg }, { reply_markup: { inline_keyboard: keyboard } });
            } catch (error) {
                logger.error('❌ Erro ao enviar verificação de hábitos:', error);
            }
        });
    }

    public async runDailyMikaAudit() {
        await this.withLock('lock:daily_mika_audit', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('🎤 Iniciando auditoria diária da Mika...');
            try {
                // 1. Coletar dados do dia
                const { trained } = await workoutService.checkDailyMessages(this.bot, chatId);
                const summary = await metricsService.getDailySummary(chatId);
                
                const auditContext = {
                    trained,
                    ...summary
                };

                // 2. Gerar resposta da Mika
                const response = await ollamaService.getDailyAuditResponse(auditContext);
                if (!response) {
                    await this.bot.sendMessage(chatId, '❌ Mika está sem voz hoje (erro na IA).');
                    return;
                }

                // 3. Converter para Áudio (edge-tts)
                const audioPath = await ttsService.generateMikaAudio(response.message);

                // 4. Enviar para o Telegram
                await this.bot.sendAudio(chatId, audioPath, {
                    caption: `🎙️ Auditoria do Dia - Mika\n\n"${response.message.substring(0, 100)}..."`
                });

                // 5. Cleanup
                await ttsService.cleanup(audioPath);
                
                logger.info('✅ Auditoria diária enviada com sucesso!');
            } catch (error) {
                logger.error('❌ Erro na auditoria diária:', error);
            }
        });
    }
}

