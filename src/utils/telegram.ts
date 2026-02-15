import TelegramBot from 'node-telegram-bot-api';

/**
 * Envia uma mensagem de áudio com caption.
 * Se falhar (ex: formato inválido), envia apenas o caption como texto.
 */
export async function sendAudioMessage(bot: TelegramBot, chatId: number, audioPath: string | null, caption: string) {
    if (audioPath) {
        try {
            await bot.sendVoice(chatId, audioPath, { caption });
        } catch (e) {
            console.error('Erro ao enviar áudio:', e);
            await bot.sendMessage(chatId, caption); // Fallback
        }
    } else {
        await bot.sendMessage(chatId, caption);
    }
}
