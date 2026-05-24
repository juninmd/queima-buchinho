import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from '../../services/workout.service';
import { myInstantsService } from '../../services/myinstants.service';
import { memeService } from '../../services/meme.service';
import { mikaService } from '../../services/mika.service';
import { ttsService } from '../../services/tts.service';
import { BOT_MESSAGES } from '../../config/constants';
import { sendAudioMessage } from '../../utils/telegram';
import { logger } from '../../utils/logger';

const reportCooldowns = new Map<number, number>();
const REPORT_COOLDOWN_MS = 60_000;

async function mikaReply(bot: TelegramBot, chatId: number, text: string) {
    const audioPath = await ttsService.generateMikaAudio(text);
    await sendAudioMessage(bot, chatId, audioPath, text);
}

async function sendMika(bot: TelegramBot, chatId: number, prompt: string) {
    const response = await mikaService.response(prompt);
    await mikaReply(bot, chatId, response.message);
}

export async function handleStatus(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    await sendMika(bot, msg.chat.id, 'Diga que o status oficial sai as 22h e que /menu mostra os habitos. Curto, no tom da Mika.');
}

export async function handleHora(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    await sendMika(bot, msg.chat.id, `Informe que o horario de Brasilia agora e ${now}. Curto, no tom da Mika.`);
}

export async function handleMotivar(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    await sendMika(bot, msg.chat.id, 'Mande uma motivacao curta para o Mestre treinar agora, sarcastica e natural.');
}

export async function handleStreak(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        const streak = await workoutService.getStreak(userId);
        await sendMika(bot, msg.chat.id, `Pessoa com streak de ${streak} dias. Responda curto, sarcastico e motivador.`);
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
        await sendMika(bot, chatId, 'Gere um relatorio diario sarcastico da Mika. Breve e ironico.');
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
        const roastAudio = trained ? null : memeService.getRoastAudio();

        await mikaReply(bot, chatId, response.message);
        if (response.audioSearchTerm) {
            const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
            if (button?.audioUrl) {
                await bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
            } else if (roastAudio) {
                await bot.sendAudio(chatId, roastAudio);
            }
        } else if (roastAudio) {
            await bot.sendAudio(chatId, roastAudio);
        }
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
        await sendMika(bot, msg.chat.id, 'Diga que cardio so registra pelo botao do /menu, nao por texto. Curto e sarcastico.');
    } catch (error) {
        logger.error('Erro ao registrar cardio:', error);
        await bot.sendMessage(msg.chat.id, BOT_MESSAGES.ERROR_GENERIC);
    }
}

export async function handleReset(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    await workoutService.resetWorkout(userId);
    await sendMika(bot, msg.chat.id, 'Diga que o status de treino de hoje foi resetado. Curto, no tom da Mika.');
}
