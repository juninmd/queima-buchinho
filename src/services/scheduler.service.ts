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

    // Runs the daily check logic
    public async runDailyCheck() {
        console.log('⏰ Executando verificação diária...');

        const chatIdStr = process.env.CHAT_ID;

        if (!chatIdStr) {
            console.error('❌ CHAT_ID não definido. Não é possível enviar notificações.');
            return;
        }

        const targetUserId = Number(chatIdStr); // O usuário alvo é o chat ID principal (assumindo DM)

        // Verificar mensagens do dia
        const { trained, message } = await workoutService.checkDailyMessages(this.bot);

        // Validar se a mensagem foi do usuário correto (caso seja grupo)
        let userTrained = false;
        let trainingMsgText = '';

        if (trained && message) {
            if (message.from?.id === targetUserId) {
                userTrained = true;
                trainingMsgText = message.text || '';
            } else {
                console.log(`⚠️ Mensagem de treino encontrada, mas de outro usuário (${message.from?.id}). Esperado: ${targetUserId}`);
            }
        }

        if (userTrained) {
            console.log('✅ Usuário treinou hoje!');
            workoutService.logWorkout(targetUserId, trainingMsgText);
            const congrats = await memeService.getCongratsMessage();
            await this.bot.sendMessage(targetUserId, congrats.message);

            if (congrats.audioSearchTerm) {
                const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);
                if (button?.audioUrl) {
                    await this.bot.sendAudio(targetUserId, button.audioUrl, { caption: `🎶 ${button.title}` });
                }
            }
        } else {
            console.log('❌ Usuário não treinou hoje.');
            const roast = await memeService.getRoastMessage();
            const roastAudio = memeService.getRoastAudio();

            await this.bot.sendMessage(targetUserId, roast.message);

            // Prioritize suggested audio from Ollama, fallback to legacy
            if (roast.audioSearchTerm) {
                const button = await myInstantsService.getBestMatchAudio(roast.audioSearchTerm);
                if (button?.audioUrl) {
                    await this.bot.sendAudio(targetUserId, button.audioUrl, { caption: `🎶 ${button.title}` });
                    return;
                }
            }

            if (roastAudio) {
                await sendAudioMessage(this.bot, targetUserId, roastAudio, BOT_MESSAGES.ROAST_CAPTION);
            }
        }
    }

    public async sendMorningReminder() {
        const targetUserId = process.env.CHAT_ID;
        if (!targetUserId) {
            console.error('❌ ERRO: CHAT_ID não definido no arquivo .env');
            return;
        }

        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayOfWeek = days[new Date().getDay()];

        console.log(`⏰ Enviando lembrete matinal de ${dayOfWeek}...`);
        const reminder = await memeService.getMorningReminder(dayOfWeek);

        await this.bot.sendMessage(Number(targetUserId), reminder.message);

        if (reminder.audioSearchTerm) {
            const button = await myInstantsService.getBestMatchAudio(reminder.audioSearchTerm);
            if (button?.audioUrl) {
                await this.bot.sendAudio(Number(targetUserId), button.audioUrl, { caption: `🎶 ${button.title}` });
            }
        }
    }

    public async sendConditionalReminder() {
        const targetUserId = process.env.CHAT_ID;
        if (!targetUserId) {
            console.error('❌ ERRO: CHAT_ID não definido no arquivo .env');
            return;
        }

        console.log('⏰ Verificando se usuário já treinou para enviar cobrança...');
        try {
            const { trained } = await workoutService.checkDailyMessages(this.bot);

            if (!trained) {
                // Brasília is UTC-3, adjust if github actions runs in UTC
                const hour = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: '2-digit' });
                const timeStr = `${hour}:00`;
                console.log(`❌ Usuário não treinou. Enviando cobrança das ${timeStr}...`);

                const reminder = await memeService.getConditionalReminder(timeStr);
                await this.bot.sendMessage(Number(targetUserId), reminder.message);

                if (reminder.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(reminder.audioSearchTerm);
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(Number(targetUserId), button.audioUrl, { caption: `🎶 ${button.title}` });
                    }
                }
            } else {
                console.log('✅ Usuário já treinou hoje. Copiou a cobrança.');
            }
        } catch (error) {
            console.error('❌ Erro ao verificar treino na cobrança:', error);
        }
    }
}
