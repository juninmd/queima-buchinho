import TelegramBot from 'node-telegram-bot-api';
import { logger } from './logger';

/**
 * Envia uma foto com caption.
 * Suporta URL ou caminho de arquivo local.
 */
export async function sendPhotoMessage(
    bot: TelegramBot,
    chatId: number,
    photoPath: string | null,
    caption?: string,
    options?: TelegramBot.SendMessageOptions
) {
    if (!photoPath) {
        if (caption) await bot.sendMessage(chatId, caption, options);
        return;
    }

    try {
        await bot.sendChatAction(chatId, 'upload_photo');
        if (photoPath.startsWith('http')) {
            await bot.sendPhoto(chatId, photoPath, { caption, ...options });
        } else {
            await bot.sendPhoto(chatId, photoPath, { caption, ...options });
        }
    } catch (e) {
        logger.error('Erro ao enviar foto:', e);
        if (caption) await bot.sendMessage(chatId, caption, options);
    }
}

/**
 * Envia uma figurinha (sticker).
 * Suporta URL ou caminho de arquivo local (.webp, .gif).
 */
export async function sendStickerMessage(
    bot: TelegramBot,
    chatId: number,
    stickerPath: string | null,
    options?: TelegramBot.SendMessageOptions
) {
    if (!stickerPath) return;

    try {
        await bot.sendChatAction(chatId, 'typing');
        if (stickerPath.startsWith('http')) {
            await bot.sendSticker(chatId, stickerPath, options);
        } else {
            await bot.sendSticker(chatId, stickerPath, options);
        }
    } catch (e) {
        logger.error('Erro ao enviar figurinha:', e);
    }
}

/**
 * Envia um GIF animado.
 * Para URLs do Giphy, usa sendAnimation se possível.
 */
export async function sendGifMessage(
    bot: TelegramBot,
    chatId: number,
    gifUrl: string | null,
    caption?: string,
    options?: TelegramBot.SendMessageOptions
) {
    if (!gifUrl) return;

    try {
        await bot.sendChatAction(chatId, 'record_video');
        if (gifUrl.includes('giphy.com') || gifUrl.includes('media.giphy.com')) {
            const webpUrl = gifUrl.replace(/\.gif$/, '.webp');
            await bot.sendSticker(chatId, webpUrl, options).catch(() => {
                bot.sendAnimation(chatId, gifUrl, { caption, ...options }).catch(() => {
                    bot.sendMessage(chatId, caption || 'GIF não disponível', options);
                });
            });
        } else {
            await bot.sendAnimation(chatId, gifUrl, { caption, ...options }).catch(() => {
                bot.sendMessage(chatId, caption || 'GIF não disponível', options);
            });
        }
    } catch (e) {
        logger.error('Erro ao enviar GIF:', e);
        if (caption) await bot.sendMessage(chatId, caption, options);
    }
}

/**
 * Responde ao chat com a fala da Mika em TEXTO. Áudio fica reservado
 * exclusivamente ao relatório final, para evitar poluição sonora.
 */
export async function replyMika(bot: TelegramBot, chatId: number, text: string) {
    await bot.sendMessage(chatId, text);
}

/**
 * Envia uma resposta da Mika apenas em TEXTO (sem voz TTS nem efeito MyInstants).
 * Áudio fica reservado exclusivamente ao relatório final.
 */
export async function sendMika(
    bot: TelegramBot,
    chatId: number,
    response: { message: string; audioSearchTerm?: string },
    options?: TelegramBot.SendMessageOptions
) {
    await bot.sendMessage(chatId, response.message, options);
}
