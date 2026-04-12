import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from './workout.service';
import { memeService } from './meme.service';
import { myInstantsService } from './myinstants.service';
import { sendAudioMessage } from '../utils/telegram';
import { BOT_MESSAGES } from '../config/constants';

export class SchedulerService {
    private bot: TelegramBot;

    constructor(bot: TelegramBot) {
        this.bot = bot;
    }

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
        } else {
            console.log('❌ Usuário não treinou hoje.');
            workoutService.logWorkout(chatId, false);
            const roast = await memeService.getRoastMessage();
            await this.bot.sendMessage(chatId, roast.message);

            if (roast.audioSearchTerm) {
                const button = await myInstantsService.getBestMatchAudio(roast.audioSearchTerm);
                if (button?.audioUrl) {
                    await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
                    return;
                }
            }

            const roastAudio = memeService.getRoastAudio();
            if (roastAudio) {
                await sendAudioMessage(this.bot, chatId, roastAudio, BOT_MESSAGES.ROAST_CAPTION);
            }
        }
    }

    public async sendMorningReminder() {
        const chatId = this.getChatId();
        if (!chatId) return;

        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayOfWeek = days[new Date().getDay()];

        console.log(`⏰ Enviando lembrete matinal de ${dayOfWeek}...`);
        await this.sendWithAudio(chatId, await memeService.getMorningReminder(dayOfWeek));
    }

    public async sendConditionalReminder() {
        const chatId = this.getChatId();
        if (!chatId) return;

        console.log('⏰ Verificando se usuário já treinou para enviar cobrança...');
        try {
            const { trained } = await workoutService.checkDailyMessages(this.bot, chatId);
            if (!trained) {
                const hour = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit' });
                console.log(`❌ Usuário não treinou. Enviando cobrança das ${hour}:00...`);
                await this.sendWithAudio(chatId, await memeService.getConditionalReminder(`${hour}:00`));
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
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🥤 +250ml', callback_data: 'add_water_250' },
                        { text: '🥛 +500ml', callback_data: 'add_water_500' }
                    ]
                ]
            }
        };
        await this.sendWithAudio(chatId, await memeService.getWaterReminder(), options);
    }

    public async sendFoodReminder(meal: 'cafe' | 'almoco' | 'jantar') {
        const chatId = this.getChatId();
        if (!chatId) return;

        console.log(`🍽️ Enviando lembrete de ${meal}...`);
        await this.sendWithAudio(chatId, await memeService.getFoodReminder(meal));
    }
}
