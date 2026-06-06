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
import { HABIT_MAP, HABITS, getProgressBar } from '../config/habits';
import { WATER_GOAL_ML } from '../config/constants';
import { getBrasiliaDayName } from '../utils/time';
import { logger } from '../utils/logger';
import { MenuController } from '../controllers/menu.controller';
import { escapeHtml } from '../utils/html';
import { sendAudioMessage } from '../utils/telegram';

const buildTrainButton = (trained: boolean): TelegramBot.InlineKeyboardButton =>
    ({ text: trained ? '🏋️‍♂️ Treino feito! ✅' : '🏋️‍♂️ Já treinei?', callback_data: 'mark_trained' });
const buildCardioButton = (done: boolean): TelegramBot.InlineKeyboardButton =>
    ({ text: done ? '🏃 Cárdio feito! ✅' : '🏃 Fiz cárdio?', callback_data: 'mark_cardio' });
const WATER_ROW: TelegramBot.InlineKeyboardButton[] = [
    { text: '🥛 +250ml', callback_data: 'add_water_250' },
    { text: '🥤 +500ml', callback_data: 'add_water_500' }
];

export class SchedulerService {
    private bot: TelegramBot;
    private readonly memoryLocks = new Map<string, ReturnType<typeof setTimeout>>();
    constructor(bot: TelegramBot) { this.bot = bot; }

    private async withLock(lockKey: string, task: () => Promise<void>, ttlSeconds = 600) {
        if (redisService.isConnected()) {
            const lock = await redisService.get(lockKey);
            if (lock) {
                logger.warn(`[Scheduler] Job ${lockKey} já está em execução (Redis). Pulando.`);
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
                logger.warn(`[Scheduler] Job ${lockKey} já está em execução (memória). Pulando.`);
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

    /**
     * Monta os botões de treino/cárdio refletindo o status REAL do dia.
     * Evita exibir o ✅ de concluído sem o Mestre ter marcado a atividade.
     */
    private async getActionButtons(chatId: number): Promise<{ train: TelegramBot.InlineKeyboardButton; cardio: TelegramBot.InlineKeyboardButton }> {
        let trained = false;
        let cardioDone = false;
        try {
            const check = await workoutService.checkDailyMessages(this.bot, chatId);
            trained = check?.trained ?? false;
            const status = await habitsService.getStatus(chatId);
            cardioDone = !!(status && status['cardio']);
        } catch (e) {
            logger.error('[Scheduler] Erro ao montar botões de ação:', e);
        }
        return { train: buildTrainButton(trained), cardio: buildCardioButton(cardioDone) };
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

    /**
     * Envia apenas o áudio da fala da Mika (voz TTS + efeito MyInstants), sem
     * repetir o texto. Usado quando o texto já vai embutido numa mensagem
     * formatada (ficha/descanso) mas precisa SEMPRE vir acompanhado de áudio.
     */
    private async sendMikaVoice(chatId: number, response: { message: string; audioSearchTerm?: string }) {
        try {
            const audioPath = await ttsService.generateMikaAudio(response.message);
            if (audioPath) {
                await this.bot.sendVoice(chatId, audioPath).catch(() => {});
                await ttsService.cleanup(audioPath);
            }
        } catch (e) {
            logger.error('[Scheduler] Erro ao enviar voz da Mika:', e);
        }
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

            const { trained } = await workoutService.checkDailyMessages(this.bot, chatId);

            if (trained) {
                logger.info('✅ Usuário treinou hoje!');
                await this.sendWithAudio(chatId, await memeService.getCongratsMessage());
                return;
            }

            logger.info('❌ Usuário não treinou hoje.');
            workoutService.logWorkout(chatId, false);
            const roast = await memeService.getRoastMessage();
            const { train, cardio } = await this.getActionButtons(chatId);
            // Adicionando termo de áudio para falha se não houver
            await this.sendWithAudio(chatId, roast, { reply_markup: { inline_keyboard: [[train, cardio]] } });
        });
    }
    public async sendGoodMorning() {
        await this.withLock('lock:good_morning', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            const dayName = getBrasiliaDayName();
            logger.info(`☀️ Enviando bom dia de ${dayName}...`);

            const menu = new MenuController(this.bot);
            await menu.sendGoodMorningMenu(chatId, chatId);
            await this.sendWithAudio(chatId, await memeService.getMorningReminder(dayName));
        });
    }

    public async sendMorningReminder() {
        await this.withLock('lock:morning_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            const dayName = getBrasiliaDayName();
            const diet = DIET_PLAN[dayName] || DIET_PLAN['segunda-feira'];

            logger.info(`⏰ Enviando lembrete matinal de ${dayName}...`);
             let msg = `🍴 <b>CARDAPIO DE HOJE</b>\n` +
                    `──────────────────────\n` +
                    `🍳 <b>Café:</b> ${escapeHtml(diet.cafe)}\n` +
                    `🍽️ <b>Almoço:</b> ${escapeHtml(diet.almoco)}\n` +
                    `🌙 <b>Jantar:</b> ${escapeHtml(diet.jantar)}`;

             const { train, cardio } = await this.getActionButtons(chatId);
             const options: TelegramBot.SendMessageOptions = {
                 parse_mode: 'HTML',
                 reply_markup: {
                     inline_keyboard: [
                         [
                             { text: '🍳 Café', callback_data: 'meal_done_cafe' },
                             { text: '🍽️ Almoço', callback_data: 'meal_done_almoco' },
                             { text: '🌙 Jantar', callback_data: 'meal_done_jantar' }
                         ],
                         [train, cardio],
                         [{ text: '📱 Abrir Menu Principal', callback_data: 'refresh_menu' }]
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

            logger.info('⏰ Verificando treino para cobrança...');
            try {
                const { trained } = await workoutService.checkDailyMessages(this.bot, chatId);
                if (!trained) {
                    const hour = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit' });
                    logger.info(`❌ Usuário não treinou. Enviando cobrança das ${hour}:00...`);
                    const roast = await memeService.getConditionalReminder(`${hour}:00`);
                    const { train, cardio } = await this.getActionButtons(chatId);
                    await this.sendWithAudio(chatId, roast, { reply_markup: { inline_keyboard: [[train, cardio]] } });
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

            logger.info(`🍽️ Enviando lembrete de ${meal}...`);
            const { train, cardio } = await this.getActionButtons(chatId);
            const options: TelegramBot.SendMessageOptions = {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `✅ Já ${label}!`, callback_data: `meal_done_${meal}` }],
                        [train, cardio],
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

            logger.info('📋 Enviando verificação de hábitos do dia...');
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
                    const btn = { text: `${h?.emoji || '✅'} ${h?.label || key}`, callback_data: `habit_${key}` };
                    i % 2 === 0 ? rows.push([btn]) : rows[rows.length - 1].push(btn);
                    return rows;
                }, []);

                await this.sendWithAudio(chatId, response, { reply_markup: { inline_keyboard: keyboard } });
            } catch (error) {
                logger.error('❌ Erro ao enviar verificação de hábitos:', error);
            }
        });
    }

    public async sendGymReminder() {
        await this.withLock('lock:gym_reminder', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            const dayName = getBrasiliaDayName();
            const day = GYM_PLAN[dayName] || GYM_PLAN['segunda-feira'];

            logger.info(`🏋️‍♂️ Enviando ficha de treino de ${dayName}...`);

            if (day.rest) {
                const response = await mikaService.response('Hoje e dia de descanso. Explique curto que recuperacao faz parte do treino, no tom da Mika.');
                await this.bot.sendMessage(chatId,
                    `${day.emoji} <b>DESCANSO</b>\n\n${escapeHtml(response.message)}`,
                    { parse_mode: 'HTML' }
                );
                await this.sendMikaVoice(chatId, response);
                return;
            }

            let msg = `${day.emoji} <b>FICHA DE HOJE — ${day.muscleGroup.toUpperCase()}</b>\n`;
            msg += `<i>${day.focus}</i>\n`;
            msg += `──────────────────────\n`;
            for (const ex of day.exercises) {
                msg += `• <b>${escapeHtml(ex.name)}</b> — ${ex.sets}\n`;
            }
            const response = await mikaService.response(`Hoje o treino e ${day.muscleGroup}. Mande uma frase curta para ir treinar, no tom da Mika.`);
            msg += `──────────────────────\n`;
            msg += `<i>${escapeHtml(response.message)}</i>`;

            const { train } = await this.getActionButtons(chatId);
            await this.bot.sendMessage(chatId, msg, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [[train]] }
            });
            await this.sendMikaVoice(chatId, response);
        });
    }

    public async sendDailyReport() {
        await this.withLock('lock:daily_report', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('🌙 Gerando relatório de fim de dia...');

            const [status, water, streak, check] = await Promise.all([
                habitsService.getStatus(chatId).catch(() => ({} as Record<string, boolean>)),
                metricsService.getTodaySum(chatId, 'water').catch(() => 0),
                workoutService.getStreak(chatId).catch(() => 0),
                workoutService.checkDailyMessages(this.bot, chatId).catch(() => ({ trained: false }))
            ]);

            const trained = check?.trained ?? false;
            const reportStatus: Record<string, boolean> = { ...status, treino: trained || !!status['treino'] };
            const cardioDone = !!reportStatus['cardio'];
            const total = HABITS.length;
            const completed = HABITS.filter(h => reportStatus[h.key]).length;
            const waterRatio = Math.min(water / WATER_GOAL_ML, 1);

            // Nota 1–10: hábitos (até 6) + treino (2) + água (até 2)
            const nota = Math.max(1, Math.min(10, Math.round(
                (completed / total) * 6 + (trained ? 2 : 0) + waterRatio * 2
            )));
            const notaEmoji = nota >= 8 ? '🏆' : nota >= 5 ? '👍' : '😬';

            const dayName = getBrasiliaDayName();
            let msg = `🌙 <b>RELATÓRIO DO DIA — ${dayName.toUpperCase()}</b>\n`;
            msg += `──────────────────────\n`;
            for (const h of HABITS) {
                msg += `${reportStatus[h.key] ? '✅' : '❌'} ${h.emoji} ${escapeHtml(h.label)}\n`;
            }
            msg += `──────────────────────\n`;
            msg += `📊 <b>Hábitos:</b> ${completed}/${total}\n`;
            msg += `<code>${getProgressBar(completed, total)}</code>\n`;
            msg += `💧 <b>Água:</b> ${water}ml / ${WATER_GOAL_ML}ml\n`;
            msg += `💪 <b>Treino:</b> ${trained ? 'Feito ✅' : 'Não treinou ❌'}\n`;
            msg += `🏃 <b>Cárdio:</b> ${cardioDone ? 'Feito ✅' : 'Não feito ❌'}\n`;
            if (streak > 0) msg += `🔥 <b>Streak:</b> ${streak} dia${streak > 1 ? 's' : ''}\n`;
            msg += `──────────────────────\n`;
            msg += `${notaEmoji} <b>Nota do dia:</b> ${nota}/10`;

            await this.bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });

            const response = await mikaService.response(
                `Relatorio do dia do Mestre: ${completed} de ${total} habitos, treino ${trained ? 'feito' : 'nao feito'}, ` +
                `cardio ${cardioDone ? 'feito' : 'nao feito'}, agua ${water}ml, nota ${nota} de 10. ` +
                `Comente curto e sarcastico sobre a nota, no tom da Mika.`
            );
            await this.sendMikaVoice(chatId, response);
        });
    }

    public async runDailyMikaAudit() {
        await this.withLock('lock:daily_mika_audit', async () => {
            const chatId = this.getChatId();
            if (!chatId) return;

            logger.info('🎙️ Iniciando auditoria diária da Mika...');
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

