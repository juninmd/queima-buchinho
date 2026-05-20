import TelegramBot from 'node-telegram-bot-api';
import { myInstantsService } from '../../services/myinstants.service';
import { mediaService } from '../../services/media.service';
import { sendGifMessage, sendStickerMessage } from '../../utils/telegram';
import { logger } from '../../utils/logger';

export async function handleInstante(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null
): Promise<void> {
    const query = match ? match[2] : '';
    if (!query) return;

    try {
        const button = await myInstantsService.getBestMatchAudio(query);
        if (button?.audioUrl) {
            await bot.sendAudio(msg.chat.id, button.audioUrl, { caption: `🎶 ${button.title}` });
        } else {
            await bot.sendMessage(msg.chat.id, '❌ Nenhum áudio encontrado no MyInstants.');
        }
    } catch (error: any) {
        logger.error('Erro ao buscar áudio no MyInstants:', error);
        await bot.sendMessage(msg.chat.id, `❌ **Erro no MyInstants:** \`${error.message || 'Erro desconhecido'}\``);
    }
}

export async function handleMemeRandom(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    try {
        await bot.sendChatAction(chatId, 'find_location');
        const gif = await mediaService.sendGif('meme');
        if (gif) {
            await sendGifMessage(bot, chatId, gif, '😂 TMJ meme pro Mestre!');
        } else {
            const localSticker = mediaService.getLocalSticker('meme');
            if (localSticker) {
                await sendStickerMessage(bot, chatId, localSticker);
            } else {
                await bot.sendMessage(chatId, '😂 Não achei nenhum meme, Lenda. Tenta de novo!');
            }
        }
    } catch (e) {
        logger.error('Erro ao buscar meme:', e);
        await bot.sendMessage(chatId, '❌ Erro ao buscar meme, Majestade.');
    }
}

export async function handleMeme(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null
): Promise<void> {
    const chatId = msg.chat.id;
    const query = match ? match[2] : '';
    if (!query) {
        await handleMemeRandom(bot, msg);
        return;
    }

    try {
        await bot.sendChatAction(chatId, 'find_location');
        const results = await mediaService.searchGifs(query, 3);
        if (results.length > 0) {
            const randomResult = results[Math.floor(Math.random() * results.length)];
            await sendGifMessage(bot, chatId, randomResult.url, `😂 Achei isso pra você: "${query}"`);
        } else {
            await bot.sendMessage(chatId, `❌ Não achei nenhum meme para "${query}", Lenda.`);
        }
    } catch (e) {
        logger.error('Erro ao buscar meme:', e);
        await bot.sendMessage(chatId, '❌ Erro ao buscar meme, Majestade.');
    }
}

export async function handleStickerRandom(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    try {
        await bot.sendChatAction(chatId, 'typing');
        const sticker = await mediaService.sendSticker('fire');
        if (sticker) {
            await sendStickerMessage(bot, chatId, sticker);
        } else {
            await bot.sendMessage(chatId, '🔥 Não achei nenhuma figurinha, Lenda. Tenta de novo!');
        }
    } catch (e) {
        logger.error('Erro ao buscar figurinha:', e);
        await bot.sendMessage(chatId, '❌ Erro ao buscar figurinha, Majestade.');
    }
}

export async function handleSticker(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null
): Promise<void> {
    const chatId = msg.chat.id;
    const query = match ? match[2] : '';
    if (!query) {
        await handleStickerRandom(bot, msg);
        return;
    }

    try {
        await bot.sendChatAction(chatId, 'typing');
        const results = await mediaService.searchStickers(query, 5);
        if (results.length > 0) {
            const randomResult = results[Math.floor(Math.random() * results.length)];
            await sendStickerMessage(bot, chatId, randomResult.url);
        } else {
            await bot.sendMessage(chatId, `❌ Não achei figurinha pra "${query}", Lenda.`);
        }
    } catch (e) {
        logger.error('Erro ao buscar figurinha:', e);
        await bot.sendMessage(chatId, '❌ Erro ao buscar figurinha, Majestade.');
    }
}

export async function handleGif(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null
): Promise<void> {
    const chatId = msg.chat.id;
    const query = match ? match[2] : '';
    if (!query) {
        await bot.sendMessage(chatId, '❌ Me diz o que você quer buscar! Ex: /gif fitness');
        return;
    }

    try {
        await bot.sendChatAction(chatId, 'record_video');
        const results = await mediaService.searchGifs(query, 5);
        if (results.length > 0) {
            const randomResult = results[Math.floor(Math.random() * results.length)];
            await sendGifMessage(bot, chatId, randomResult.url, `🎬 GIF pra: "${query}"`);
        } else {
            await bot.sendMessage(chatId, `❌ Não achei GIF pra "${query}", Lenda.`);
        }
    } catch (e) {
        logger.error('Erro ao buscar GIF:', e);
        await bot.sendMessage(chatId, '❌ Erro ao buscar GIF, Majestade.');
    }
}
