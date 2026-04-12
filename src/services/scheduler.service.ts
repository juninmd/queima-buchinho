import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from './workout.service';
import { memeService } from './meme.service';
import { habitsService } from './habits.service';
import { ollamaService } from './ollama.service';
import { myInstantsService } from './myinstants.service';
import { sendAudioMessage } from '../utils/telegram';
import { BOT_MESSAGES } from '../config/constants';
import { HABIT_MAP } from '../config/habits';

const TRAIN_BTN: TelegramBot.InlineKeyboardButton = { text: '🏋️‍♂️ Já treinei! ✅', callback_data: 'mark_trained' };
const WATER_ROW: TelegramBot.InlineKeyboardButton[] = [
    { text: '🥤 +250ml', callback_data: 'add_water_250' },
    { text: '🥛 +500ml', callback_data: 'add_water_500' }
];

export class SchedulerService {
    private bot: TelegramBot;
    constructor(bot: TelegramBot) { this.bot = bot; }

    private getChatId(): number | null {
        const chatIdStr = process.env.CHAT_ID;
        if (!chatIdStr) {
            console.error('❌ CHAT_ID não definido.');
            return null;
        }
        return Number(chatIdStr);
    }

    private async sendWithAudio(chatId: number, response: { message: string; audioSearchTerm?: string }, options?: TelegramBot.SendMessageOptions) {
        await this.bot.sendMessage(chatId, response.message, options);
        if (response.audioSearchTerm) {
            const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
            if (button?.audioUrl) {
                await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
            }
        }
    }

    public async runDailyCheck() {
        console.log('⏰ Executando verificação diária...');
        const chatId = this.getChatId();
        if (!chatId) return;

        const { trained, message } = await workoutService.checkDailyMessages(this.bot, chatId);
        const trainingMsgText = message?.text || '';

        if (trained) {
            console.log('✅ Usuário treinou hoje!');
            workoutService.logWorkout(chatId, true, trainingMsgText);
            await this.sendWithAudio(chatId, await memeService.getCongratsMessage());
            return;
        }

        console.log('❌ Usuário não treinou hoje.');
        workoutService.logWorkout(chatId, false);
        const roast = await memeService.getRoastMessage();
        const options: TelegramBot.SendMessageOptions = {
            reply_markup: { inline_keyboard: [[TRAIN_BTN]] }
        };
        await this.bot.sendMessage(chatId, roast.message, options);

        const audioTerm = roast.audioSearchTerm;
        const matchedAudio = audioTerm ? await myInstantsService.getBestMatchAudio(audioTerm) : null;
        if (matchedAudio?.audioUrl) {
            await this.bot.sendAudio(chatId, matchedAudio.audioUrl, { caption: `🎶 ${matchedAudio.title}` });
            return;
        }
        const roastAudio = memeService.getRoastAudio();
        if (roastAudio) await sendAudioMessage(this.bot, chatId, roastAudio, BOT_MESSAGES.ROAST_CAPTION);
    }

    public async sendMorningReminder() {
        const chatId = this.getChatId();
        if (!chatId) return;

        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayOfWeek = days[new Date().getDay()];

        console.log(`⏰ Enviando lembrete matinal de ${dayOfWeek}...`);
        const options: TelegramBot.SendMessageOptions = {
            reply_markup: {
                inline_keyboard: [
                    [TRAIN_BTN],
                    [{ text: '💊 Suplemento ✅', callback_data: 'habit_suplemento' },
                     { text: '🧘 Alongamento ✅', callback_data: 'habit_alongamento' }]
                ]
            }
        };
        await this.sendWithAudio(chatId, await memeService.getMorningReminder(dayOfWeek), options);
    }

    public async sendConditionalReminder() {
        const chatId = this.getChatId();
        if (!chatId) return;

        console.log('⏰ Verificando treino para cobrança...');
        try {
            const { trained } = await workoutService.checkDailyMessages(this.bot, chatId);
            if (!trained) {
                const hour = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit' });
                console.log(`❌ Usuário não treinou. Enviando cobrança das ${hour}:00...`);
            const options: TelegramBot.SendMessageOptions = {
                reply_markup: { inline_keyboard: [[TRAIN_BTN]] }
            };
                await this.sendWithAudio(chatId, await memeService.getConditionalReminder(`${hour}:00`), options);
            } else {
                console.log('✅ Usuário já treinou hoje. Pulando cobrança.');
            }
        } catch (error) {
            console.error('❌ Erro ao verificar treino na cobrança:', error);
        }
    }

    public async sendWaterReminder() {
        const chatId = this.getChatId();
        if (!chatId) return;

        console.log('💧 Enviando lembrete de água...');
        const options: TelegramBot.SendMessageOptions = {
            reply_markup: { inline_keyboard: [WATER_ROW, [{ text: '🍼 +1L', callback_data: 'add_water_1000' }]] }
        };
        await this.sendWithAudio(chatId, await memeService.getWaterReminder(), options);
    }

    public async sendFoodReminder(meal: 'cafe' | 'almoco' | 'jantar') {
        const chatId = this.getChatId();
        if (!chatId) return;

        const habit = HABIT_MAP.get(meal);
        const label = habit?.emoji ? `${habit.emoji} ${habit.label}` : meal;

        console.log(`🍽️ Enviando lembrete de ${meal}...`);
        const options: TelegramBot.SendMessageOptions = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `✅ Já ${label}!`, callback_data: `meal_done_${meal}` }],
                    WATER_ROW
                ]
            }
        };
        await this.sendWithAudio(chatId, await memeService.getFoodReminder(meal), options);
    }

    public async sendHabitsCheckReminder() {
        const chatId = this.getChatId();
        if (!chatId) return;

        console.log('📋 Enviando verificação de hábitos do dia...');
        try {
            const uncompleted = await habitsService.getUncompletedHabits(chatId);
            if (uncompleted.length === 0) {
                await this.bot.sendMessage(chatId, '🎉 Parabéns! Todos os hábitos do dia foram completados! Mika tá orgulhosa 💜');
                return;
            }

            const labels = uncompleted.map(key => {
                const h = HABIT_MAP.get(key);
                return h ? `${h.emoji} ${h.label}` : key;
            });

            const response = await ollamaService.getHabitsCheckReminder(labels);
            const msg = response?.message || `⚠️ Faltam ${uncompleted.length} hábitos hoje: ${labels.join(', ')}`;

            const keyboard = uncompleted.slice(0, 4).reduce<TelegramBot.InlineKeyboardButton[][]>((rows, key, i) => {
                const h = HABIT_MAP.get(key);
                const btn = { text: `${h?.emoji || '✅'} ${h?.label || key}`, callback_data: `habit_${key}` };
                i % 2 === 0 ? rows.push([btn]) : rows[rows.length - 1].push(btn);
                return rows;
            }, []);

            await this.bot.sendMessage(chatId, msg, { reply_markup: { inline_keyboard: keyboard } });
        } catch (error) {
            console.error('❌ Erro ao enviar verificação de hábitos:', error);
        }
    }
}
