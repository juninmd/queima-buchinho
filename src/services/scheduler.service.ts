import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from './workout.service';
import { memeService } from './meme.service';
import { sendAudioMessage } from '../utils/telegram';

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

            // Registrar no histórico
            workoutService.logWorkout(targetUserId, trainingMsgText);

            await this.bot.sendMessage(targetUserId, '🎉 Parabéns! Você cumpriu sua meta de treino hoje! Histórico atualizado. 💪');
        } else {
            console.log('❌ Usuário não treinou hoje.');

            const roastMessage = memeService.getRoastMessage();
            const roastAudio = memeService.getRoastAudio();

            await this.bot.sendMessage(targetUserId, roastMessage);

            if (roastAudio) {
                await sendAudioMessage(this.bot, targetUserId, roastAudio, 'Ouça isso e reflita...');
            }
        }
    }
}
