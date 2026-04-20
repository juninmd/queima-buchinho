import TelegramBot from 'node-telegram-bot-api';
import { logger } from './logger';

/**
 * Envia uma mensagem de áudio com caption.
 * Se falhar (ex: formato inválido), envia apenas o caption como texto.
 */
export async function sendAudioMessage(
    bot: TelegramBot,
    chatId: number,
    audioPath: string | null,
    caption: string,
    options?: TelegramBot.SendMessageOptions
) {
    if (audioPath) {
        try {
            await bot.sendChatAction(chatId, 'record_voice');
            await bot.sendVoice(chatId, audioPath, { caption, ...options });
        } catch (e) {
            logger.error('Erro ao enviar áudio:', e);
            await bot.sendMessage(chatId, caption, options);
        }
    } else {
        await bot.sendMessage(chatId, caption, options);
    }
}
