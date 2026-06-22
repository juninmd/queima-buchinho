import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from '../../services/workout.service';
import { memeService } from '../../services/meme.service';
import { mikaService } from '../../services/mika.service';
import { mediaService } from '../../services/media.service';
import { BOT_MESSAGES } from '../../config/constants';
import { sendGifMessage } from '../../utils/telegram';
import { getMikaContext } from '../../utils/time';
import { logger } from '../../utils/logger';
import { SchedulerService } from '../../services/scheduler.service';

const reportCooldowns = new Map<number, number>();
const REPORT_COOLDOWN_MS = 60_000;

async function mikaReply(bot: TelegramBot, chatId: number, text: string) {
    // Texto apenas: áudio fica reservado ao relatório final.
    await bot.sendMessage(chatId, text);
}

async function sendMika(bot: TelegramBot, chatId: number, prompt: string) {
    const response = await mikaService.response(prompt);
    await mikaReply(bot, chatId, response.message);
}

export async function handleStatus(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const ctx = getMikaContext();
    await sendMika(bot, msg.chat.id, `${ctx} Diga que o status oficial sai as 22h e que /menu mostra os habitos. Se o horario atual for proximo das 22h, comente. Curto, no tom da Mika.`);
}

export async function handleHora(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const ctx = getMikaContext();
    await sendMika(bot, msg.chat.id, `${ctx} Informe o horario atual de Brasilia de forma natural e no tom da Mika. Adicione um comentario ironico sobre o que o Mestre deveria estar fazendo nesse horario.`);
}

export async function handleMotivar(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const ctx = getMikaContext();
    await sendMika(bot, msg.chat.id, `${ctx} Mande uma motivacao curta para o Mestre treinar agora, sarcastica e natural. Adapte ao horario: se for manha, charge matinal; se for tarde, cobranca; se for noite tarde, ironia mas ainda incentivando.`);
}

export async function handleStreak(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        const streak = await workoutService.getStreak(userId);
        const ctx = getMikaContext();
        await sendMika(bot, msg.chat.id, `${ctx} Pessoa com streak de ${streak} dia${streak !== 1 ? 's' : ''}. Responda curto, sarcastico e motivador. Mencione o horario de forma ironica se fizer sentido.`);
    } catch (error) {
        logger.error('Erro ao verificar streak:', error);
        await bot.sendMessage(msg.chat.id, BOT_MESSAGES.ERROR_GENERIC);
    }
}

export async function handleRelatorio(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    const chatId = msg.chat.id;
    if (!userId) return;

    try {
        const lastUsed = reportCooldowns.get(userId);
        if (lastUsed && Date.now() - lastUsed < REPORT_COOLDOWN_MS) {
            await sendMika(bot, chatId, 'Diga que o relatorio acabou de ser gerado e precisa esperar um minuto. Curto e sarcastico.');
            return;
        }
        reportCooldowns.set(userId, Date.now());

        await bot.sendChatAction(chatId, 'typing');
        const scheduler = new SchedulerService(bot);
        await scheduler.sendDailyReport(chatId, userId);
    } catch (error) {
        logger.error('Erro ao processar /relatorio:', error);
        await bot.sendMessage(chatId, BOT_MESSAGES.ERROR_GENERIC);
    }
}

export async function handleCheckTreino(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
        await bot.sendChatAction(chatId, 'typing');
        const { trained } = await workoutService.checkDailyMessages(bot, chatId);
        const response = trained ? await memeService.getCongratsMessage() : await memeService.getRoastMessage();

        await sendGifMessage(bot, chatId, await mediaService.getRandomGif(trained ? 'celebration' : 'roast'));
        await mikaReply(bot, chatId, response.message);
    } catch (error) {
        logger.error('Erro ao verificar treino:', error);
        await bot.sendMessage(chatId, BOT_MESSAGES.ERROR_GENERIC);
    }
}

export async function handleCardio(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        const ctx = getMikaContext();
        await sendMika(bot, msg.chat.id, `${ctx} Diga que cardio so registra pelo botao do /menu, nao por texto. Curto e sarcastico. Se o horario sugerir que o Mestre ja deveria ter feito cardio, provoque.`);
    } catch (error) {
        logger.error('Erro ao registrar cardio:', error);
        await bot.sendMessage(msg.chat.id, BOT_MESSAGES.ERROR_GENERIC);
    }
}

export async function handleReset(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    await workoutService.resetWorkout(userId);
    const ctx = getMikaContext();
    await sendMika(bot, msg.chat.id, `${ctx} Diga que o status de treino de hoje foi resetado. Se o horario for tarde, adicione ironia sobre resetar treino tao tarde. Curto, no tom da Mika.`);
}
