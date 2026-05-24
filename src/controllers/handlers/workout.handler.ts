import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from '../../services/workout.service';
import { ollamaService } from '../../services/ollama.service';
import { myInstantsService } from '../../services/myinstants.service';
import { memeService } from '../../services/meme.service';
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

export async function handleStatus(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    await mikaReply(bot, msg.chat.id, BOT_MESSAGES.STATUS_INFO);
}

export async function handleHora(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    await mikaReply(bot, msg.chat.id, `🕒 *Horário de Brasília:* ${now}`);
}

export async function handleMotivar(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const audio = memeService.getMotivationAudio();
    await sendAudioMessage(bot, msg.chat.id, audio, BOT_MESSAGES.MOTIVATION_CAPTION);
}

export async function handleStreak(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        const streak = await workoutService.getStreak(userId);

        if (streak === 1) {
            await mikaReply(bot, msg.chat.id, `🔥 Primeiro dia! Amanhã é dia 2. Não para agora!`);
        } else if (streak > 1) {
            const response = await ollamaService.generateDynamicResponse(
                `Pessoa com streak de ${streak} dias. Diga algo motivador e ácido.`
            );
            await mikaReply(bot, msg.chat.id, response?.message || `🔥 ${streak} dias seguidos!`);
        } else {
            const response = await ollamaService.generateDynamicResponse(
                `Pessoa com 0 dias de streak. Diga algo sarcástico.`
            );
            await mikaReply(bot, msg.chat.id, response?.message || '👎 Zero dias de sequência. Começa hoje!');
        }
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
            await bot.sendMessage(chatId, BOT_MESSAGES.RELATORIO_COOLDOWN);
            return;
        }
        reportCooldowns.set(userId, Date.now());

        await bot.sendChatAction(chatId, 'typing');

        const response = await ollamaService.generateDynamicResponse(
            `Gere um relatório diário sarcástico da Mika. Breve e irônico.`
        );

        if (response) {
            await mikaReply(bot, chatId, response.message);
        } else {
            await bot.sendMessage(chatId, '❌ Erro ao gerar relatório.');
        }
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

        if (trained) {
            const congrats = await memeService.getCongratsMessage();
            await mikaReply(bot, chatId, congrats.message);
            if (congrats.audioSearchTerm) {
                const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);
                if (button?.audioUrl) {
                    await bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
                }
            }
        } else {
            const roast = await memeService.getRoastMessage();
            const roastAudio = memeService.getRoastAudio();
            await mikaReply(bot, chatId, roast.message);
            if (roast.audioSearchTerm) {
                const button = await myInstantsService.getBestMatchAudio(roast.audioSearchTerm);
                if (button?.audioUrl) {
                    await bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
                } else if (roastAudio) {
                    await bot.sendAudio(chatId, roastAudio);
                }
            } else if (roastAudio) {
                await bot.sendAudio(chatId, roastAudio);
            }
        }
    } catch (error) {
        logger.error('Erro ao verificar treino:', error);
        await mikaReply(bot, chatId, `❌ Erro no Check-treino: ${(error as Error).message}`);
    }
}

export async function handleCardio(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        await mikaReply(bot, msg.chat.id, 'Cardio agora so pelo botao, atleta de teclado. Abre /menu e clica.');
    } catch (error) {
        logger.error('Erro ao registrar cardio:', error);
        await bot.sendMessage(msg.chat.id, BOT_MESSAGES.ERROR_GENERIC);
    }
}

export async function handleReset(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    await workoutService.resetWorkout(userId);
    await mikaReply(bot, msg.chat.id, BOT_MESSAGES.RESET_SUCCESS);
}
