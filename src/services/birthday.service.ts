import TelegramBot from 'node-telegram-bot-api';
import { mikaService } from './mika.service';
import { mediaService } from './media.service';
import { myInstantsService } from './myinstants.service';
import { ttsService } from './tts.service';
import { isTodayBirthday, getBirthdayAge } from '../utils/time';
import { sendGifMessage, sendStickerMessage } from '../utils/telegram';
import { logger } from '../utils/logger';

const BIRTHDAY_GIF_QUERIES = [
  'happy birthday party celebration',
  'birthday cake candles',
  'feliz aniversario festa',
  'birthday confetti dance',
];

const BIRTHDAY_STICKER_QUERIES = [
  'happy birthday cake',
  'birthday party celebration',
  'feliz aniversario',
  'birthday balloons',
];

const BIRTHDAY_SOUND_QUERIES = [
  'parabéns para você',
  'happy birthday',
  'parabens',
  'aniversario',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function sendBirthdayCelebration(bot: TelegramBot, chatId: number): Promise<void> {
  if (!isTodayBirthday()) return;

  const age = getBirthdayAge();
  const ageText = age ? `${age} anos` : 'mais um ano de domínio mundial';

  logger.info(`🎂 [Birthday] Iniciando celebração para chatId ${chatId}, idade: ${age ?? '?'}`);

  // 1. LLM gera a mensagem de parabéns
  const response = await mikaService.response(
    `HOJE É ANIVERSÁRIO DO MESTRE! Ele está completando ${ageText}. ` +
    `Manda uma mensagem de parabéns no estilo da Mika: sarcástica mas genuinamente carinhosa, ` +
    `faz uma piada com a idade, deseja força nos treinos do novo ciclo. ` +
    `Pode ser um pouco mais longa que o normal — é um dia especial. ` +
    `No audioSearchTerm coloca um termo de som de festa/parabéns animado.`
  );

  // 2. GIF primeiro — impacto visual imediato
  try {
    const gifResults = await mediaService.searchGifs(pickRandom(BIRTHDAY_GIF_QUERIES), 10);
    if (gifResults.length > 0) {
      await sendGifMessage(bot, chatId, pickRandom(gifResults).url);
    }
  } catch (e) {
    logger.error('[Birthday] Erro ao enviar GIF:', e);
  }

  // 3. Voz da Mika com a mensagem gerada pelo LLM
  try {
    const audioPath = await ttsService.generateMikaAudio(response.message);
    if (audioPath) {
      await bot.sendVoice(chatId, audioPath, { caption: `🎂 ${response.message}` });
      await ttsService.cleanup(audioPath);
    } else {
      await bot.sendMessage(chatId, `🎂 ${response.message}`);
    }
  } catch (e) {
    logger.error('[Birthday] Erro no TTS:', e);
    await bot.sendMessage(chatId, `🎂 ${response.message}`).catch(() => {});
  }

  // 4. Sticker
  try {
    const stickerResults = await mediaService.searchStickers(pickRandom(BIRTHDAY_STICKER_QUERIES), 10);
    if (stickerResults.length > 0) {
      await sendStickerMessage(bot, chatId, pickRandom(stickerResults).url);
    }
  } catch (e) {
    logger.error('[Birthday] Erro ao enviar sticker:', e);
  }

  // 5. Som de festa — tenta o termo sugerido pelo LLM primeiro, depois os fallbacks
  const soundCandidates = [
    response.audioSearchTerm,
    ...BIRTHDAY_SOUND_QUERIES,
  ].filter(Boolean) as string[];

  for (const term of soundCandidates) {
    try {
      const audio = await myInstantsService.getBestMatchAudio(term);
      if (audio?.audioUrl) {
        await bot.sendAudio(chatId, audio.audioUrl, { caption: `🎶 ${audio.title}` });
        break;
      }
    } catch (e) {
      logger.error(`[Birthday] Erro no som "${term}":`, e);
    }
  }

  // 6. Segundo GIF — encerra com chave (diferente do primeiro)
  try {
    const queries = BIRTHDAY_GIF_QUERIES.filter(q => q !== BIRTHDAY_GIF_QUERIES[0]);
    const gifResults = await mediaService.searchGifs(pickRandom(queries), 10);
    if (gifResults.length > 0) {
      await sendGifMessage(bot, chatId, pickRandom(gifResults).url);
    }
  } catch (e) {
    logger.error('[Birthday] Erro ao enviar GIF final:', e);
  }

  logger.info('🎂 [Birthday] Celebração enviada com sucesso!');
}
