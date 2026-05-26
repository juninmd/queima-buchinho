import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from './workout.service';
import { habitsService } from './habits.service';
import { metricsService } from './metrics.service';
import { ollamaService } from './ollama.service';
import { memeService } from './meme.service';
import { mikaService } from './mika.service';
import { redisService } from './redis.service';
import { ttsService } from './tts.service';
import { myInstantsService } from './myinstants.service';
import { DIET_PLAN } from '../config/diet';
import { GYM_PLAN } from '../config/gym';
import { HABIT_MAP } from '../config/habits';
import { getBrasiliaDayName } from '../utils/time';
import { logger } from '../utils/logger';
import { MenuController } from '../controllers/menu.controller';
import { escapeHtml } from '../utils/html';
import { sendAudioMessage } from '../utils/telegram';

const TRAIN_BTN: TelegramBot.InlineKeyboardButton = { text: 'ðŸ‹ï¸â€â™‚ï¸ JÃ¡ treinei! âœ…', callback_data: 'mark_trained' };
const CARDIO_BTN: TelegramBot.InlineKeyboardButton = { text: 'ðŸƒ CÃ¡rdio feito! âœ…', callback_data: 'mark_cardio' };
const WATER_ROW: TelegramBot.InlineKeyboardButton[] = [
    { text: 'ðŸ¥¤ +250ml', callback_data: 'add_water_250' },
    { text: 'ðŸ¥› +500ml', callback_data: 'add_water_500' }
];

export class SchedulerService {
    private bot: TelegramBot;
    private readonly memoryLocks = new Map<string, ReturnType<typeof setTimeout>>();
    constructor(bot: TelegramBot) { this.bot = bot; }

    private async withLock(lockKey: string, task: () => Promise<void>, ttlSeconds = 600) {
        if (redisService.isConnected()) {
            const lock = await redisService.get(lockKey);
            if (lock) {
                logger.warn(`[Scheduler] Job ${lockKey} jÃ¡ estÃ¡ em execuÃ§Ã£o (Redis). Pulando.`);
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
        } else {
            if (this.memoryLocks.has(lockKey)) {
                logger.warn(`[Scheduler] Job ${lockKey} jÃ¡ estÃ¡ em execuÃ§Ã£o (memÃ³ria). Pulando.`);
                return;
            }
            const timer = setTimeout(() => this.memoryLocks.delete(lockKey), ttlSeconds * 1000);
            this.memoryLocks.set(lockKey, timer);
            try {
                await task();
            } catch (error) {
                logger.error(`[Scheduler] Erro ao executar ${lockKey}:`, error);
            } finally {
                clearTimeout(this.memoryLocks.get(lockKey));
                this.memoryLocks.delete(lockKey);
            }
        }
    }

    private getChatId(): number | null {
        const chatIdStr = process.env.CHAT_ID;
        if (!chatIdStr) {
            logger.error('âŒ CHAT_ID nÃ£o definido.');
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

        // Se tiver termo de Ã¡udio (ou se for falha), tentar enviar MyInstants tambÃ©m
        if (response.audioSearchTerm) {
            try {
                const instant = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
                if (instant?.audioUrl) {
                    await this.bot.sendAudio(chatId, instant.audioUrl, { caption: `ðŸŽ¶ ${instant.title}` });
                }
            } catch (err) {
                logger.error('[Scheduler] Erro ao enviar Ã¡udio do MyInstants:', err);
            }
        }
    }

    public async runDailyCheck() {
        await this.withLock('lock:daily_check', async () => {
            logger.info('â° Executando verificaÃ§Ã£o diÃ¡ria...');
            const chatId = this.getChatId();
            if (!chatId) return;

            const { trained } = await workoutService.checkDailyMessages(this.bot, chatId);

            if (trained) {
                logger.info('âœ… UsuÃ¡rio treinou hoje!');
                await this.sendWithAudio(chatId, await memeService.getCongratsMessage());
                return;
            }

            logger.info('âŒ UsuÃ¡rio nÃ£o treinou hoje.');
            workoutService.logWorkout(chatId, false);
            const roast = await memeService.getRoastMessage();
            // Adicionando termo de Ã¡udio para falha se nÃ£o houver
            await this.sendWithAudio(chatId, roast, { reply_markup: { inline_keyboard: [[TRAIN_BTN, CARDIO_BTN]] } });
        });
    }
    public async sendMorningReminder() {
        await this.withLock('lock:morning_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            const dayName = getBrasiliaDayName();
            const diet = DIET_PLAN[dayName] || DIET_PLAN['segunda-feira'];

            logger.info(`â° Enviando lembrete matinal de ${dayName}...`);
             let msg = `🍴 <b>CARDAPIO DE HOJE</b>\n` +
                    `â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n` +
                    `ðŸ³ <b>CafÃ©:</b> ${escapeHtml(diet.cafe)}\n` +
                    `ðŸ½ï¸ <b>AlmoÃ§o:</b> ${escapeHtml(diet.almoco)}\n` +
                    `ðŸŒ™ <b>Jantar:</b> ${escapeHtml(diet.jantar)}`;

             const options: TelegramBot.SendMessageOptions = {
                 parse_mode: 'HTML',
                 reply_markup: {
                     inline_keyboard: [
                         [
                             { text: 'ðŸ³ CafÃ©', callback_data: 'meal_done_cafe' },
                             { text: 'ðŸ½ï¸ AlmoÃ§o', callback_data: 'meal_done_almoco' },
                             { text: 'ðŸŒ™ Jantar', callback_data: 'meal_done_jantar' }
                         ],
                         [TRAIN_BTN, CARDIO_BTN],
                         [{ text: 'ðŸ“± Abrir Menu Principal', callback_data: 'refresh_menu' }]
                     ]
                 }
             };

             await this.bot.sendMessage(chatId, msg, options);
             await this.sendWithAudio(chatId, await memeService.getMorningReminder(dayName));
        });
    }

    public async sendConditionalReminder() {
        await this.withLock('lock:conditional_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('â° Verificando treino para cobranÃ§a...');
            try {
                const { trained } = await workoutService.checkDailyMessages(this.bot, chatId);
                if (!trained) {
                    const hour = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit' });
                    logger.info(`âŒ UsuÃ¡rio nÃ£o treinou. Enviando cobranÃ§a das ${hour}:00...`);
                    const roast = await memeService.getConditionalReminder(`${hour}:00`);
                    await this.sendWithAudio(chatId, roast, { reply_markup: { inline_keyboard: [[TRAIN_BTN, CARDIO_BTN]] } });
                } else {
                    logger.info('âœ… UsuÃ¡rio jÃ¡ treinou hoje. Pulando cobranÃ§a.');
                }
            } catch (error) {
                logger.error('âŒ Erro ao verificar treino na cobranÃ§a:', error);
            }
        });
    }

    public async sendWaterReminder() {
        await this.withLock('lock:water_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('ðŸ’§ Enviando lembrete de Ã¡gua...');
            const options: TelegramBot.SendMessageOptions = {
                reply_markup: { inline_keyboard: [WATER_ROW, [{ text: 'ðŸ¼ +1L', callback_data: 'add_water_1000' }]] }
            };
            const reminder = await memeService.getWaterReminder();
            await this.sendWithAudio(chatId, reminder, options);
        });
    }

    public async sendFoodReminder(meal: 'cafe' | 'almoco' | 'cafe_tarde' | 'jantar') {
        await this.withLock(`lock:food_reminder_${meal}`, async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            const habit = HABIT_MAP.get(meal);
            const label = habit?.emoji ? `${habit.emoji} ${habit.label}` : meal;
            const dayName = getBrasiliaDayName();
            const diet = DIET_PLAN[dayName] || DIET_PLAN['segunda-feira'];
            const mealDescription = diet[meal];

            logger.info(`ðŸ½ï¸ Enviando lembrete de ${meal}...`);
            const options: TelegramBot.SendMessageOptions = {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `âœ… JÃ¡ ${label}!`, callback_data: `meal_done_${meal}` }],
                        [TRAIN_BTN, CARDIO_BTN],
                        WATER_ROW
                    ]
                }
            };

            const reminder = await memeService.getFoodReminder(meal);
            reminder.message = `${reminder.message}\n\n` +
                               `🍴 <b>HORA DO ${meal.toUpperCase()}!</b>\n` +
                               `──────────────────────\n` +
                               `✅ <b>O que comer:</b>\n${escapeHtml(mealDescription)}\n\n` +
                               `──────────────────────`;
            
            await this.sendWithAudio(chatId, reminder, options);
        });
    }

    public async sendHabitsCheckReminder() {
        await this.withLock('lock:habits_check', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('ðŸ“‹ Enviando verificaÃ§Ã£o de hÃ¡bitos do dia...');
            try {
                const uncompleted = await habitsService.getUncompletedHabits(chatId);
                if (uncompleted.length === 0) {
                    const allDone = await mikaService.response('O Mestre completou todos os habitos do dia. Elogie de forma curta e genuina.');
                    await this.sendWithAudio(chatId, allDone);
                    return;
                }

                const labels = uncompleted.map(key => {
                    const h = HABIT_MAP.get(key);
                    return h ? `${h.emoji} ${h.label}` : key;
                });

                const response = await mikaService.response(
                    `Habitos ainda nao feitos hoje: ${labels.join(', ')}. Cobra de forma amigavel mas direta, sem sermao.`
                );

                const keyboard = uncompleted.slice(0, 4).reduce<TelegramBot.InlineKeyboardButton[][]>((rows, key, i) => {
                    const h = HABIT_MAP.get(key);
                    const btn = { text: `${h?.emoji || 'âœ…'} ${h?.label || key}`, callback_data: `habit_${key}` };
                    i % 2 === 0 ? rows.push([btn]) : rows[rows.length - 1].push(btn);
                    return rows;
                }, []);

                await this.sendWithAudio(chatId, response, { reply_markup: { inline_keyboard: keyboard } });
            } catch (error) {
                logger.error('âŒ Erro ao enviar verificaÃ§Ã£o de hÃ¡bitos:', error);
            }
        });
    }

    public async sendGymReminder() {
        await this.withLock('lock:gym_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            const dayName = getBrasiliaDayName();
            const day = GYM_PLAN[dayName] || GYM_PLAN['segunda-feira'];

            logger.info(`ðŸ‹ï¸ Enviando ficha de treino de ${dayName}...`);

            if (day.rest) {
                const response = await mikaService.response('Hoje e dia de descanso. Explique curto que recuperacao faz parte do treino, no tom da Mika.');
                await this.bot.sendMessage(chatId,
                    `${day.emoji} <b>DESCANSO</b>\n\n${escapeHtml(response.message)}`,
                    { parse_mode: 'HTML' }
                );
                return;
            }

            let msg = `${day.emoji} <b>FICHA DE HOJE â€” ${day.muscleGroup.toUpperCase()}</b>\n`;
            msg += `<i>${day.focus}</i>\n`;
            msg += `â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n`;
            for (const ex of day.exercises) {
                msg += `â€¢ <b>${escapeHtml(ex.name)}</b> â€” ${ex.sets}\n`;
            }
            const response = await mikaService.response(`Hoje o treino e ${day.muscleGroup}. Mande uma frase curta para ir treinar, no tom da Mika.`);
            msg += `â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n`;
            msg += `<i>${escapeHtml(response.message)}</i>`;

            await this.bot.sendMessage(chatId, msg, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[TRAIN_BTN]] }
            });
        });
    }

    public async runDailyMikaAudit() {
        await this.withLock('lock:daily_mika_audit', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('ðŸŽ¤ Iniciando auditoria diÃ¡ria da Mika...');
            try {
                // 1. Coletar dados do dia
                const [{ trained }, summary, streak, habitsCount] = await Promise.all([
                    workoutService.checkDailyMessages(this.bot, chatId),
                    metricsService.getDailySummary(chatId),
                    workoutService.getStreak(chatId),
                    habitsService.getCompletedCount(chatId),
                ]);

                const auditContext = {
                    trained,
                    ...summary,
                    streak,
                    habitsCompleted: habitsCount.completed,
                    habitsTotal: habitsCount.total,
                };

                // 2. Gerar resposta da Mika
                const response = await ollamaService.getDailyAuditResponse(auditContext);
                if (!response) {
                    throw new Error('Mika LLM response unavailable');
                }

                // 3. Converter para Ãudio (edge-tts)
                const audioPath = await ttsService.generateMikaAudio(response.message);

                // 4. Enviar para o Telegram
                await this.bot.sendAudio(chatId, audioPath, {
                    caption: `ðŸŽ™ï¸ Auditoria do Dia - Mika\n\n"${response.message.substring(0, 100)}..."`
                });

                // 5. Cleanup
                await ttsService.cleanup(audioPath);
                
                logger.info('âœ… Auditoria diÃ¡ria enviada com sucesso!');
            } catch (error) {
                logger.error('âŒ Erro na auditoria diÃ¡ria:', error);
            }
        });
    }
}

