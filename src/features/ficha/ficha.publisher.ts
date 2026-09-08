import TelegramBot from 'node-telegram-bot-api';
import { mikaService } from '../../services/mika.service';
import { habitsService } from '../../services/habits.service';
import { workoutService } from '../../services/workout.service';
import { redisService } from '../../services/redis.service';
import { getMikaContext } from '../../utils/time';
import { logger } from '../../utils/logger';
import { fichaService } from './ficha.service';
import { mainKeyboard, renderAlbum, renderFicha } from './render';
import type { Ficha } from './types';

const LOCK_KEY = 'lock:ficha_diaria';
const LOCK_TTL_S = 600;

/** Chat de destino e dono dos dados: mesma convenção do resto do bot (grupo ≠ usuário). */
export const getFichaChatId = (): number | null =>
  process.env.CHAT_ID ? Number(process.env.CHAT_ID) : null;
export const getFichaUserId = (): number | null => {
  const raw = process.env.USER_ID || process.env.CHAT_ID;
  return raw ? Number(raw) : null;
};

/** A provocação é enfeite: se o LLM cair ou demorar, a ficha das 6h sai do mesmo jeito. */
async function provocacao(ficha: Ficha): Promise<string | undefined> {
  try {
    const ctx = getMikaContext();
    const r = await mikaService.response(
      `${ctx} O treino de hoje e "${ficha.titulo}" com foco em queima de gordura, terminando com ${ficha.exercicios[ficha.exercicios.length - 1].nome}. Mande UMA frase curta e sarcastica para o Mestre ir treinar.`
    );
    return r.message;
  } catch (e) {
    logger.warn('Mika indisponível para a ficha; publicando sem provocação', { erro: String(e) });
    return undefined;
  }
}

/** Envia o álbum de aparelhos. Falha de imagem não pode derrubar a publicação da ficha. */
async function sendAlbum(bot: TelegramBot, chatId: number, ficha: Ficha): Promise<void> {
  try {
    await bot.sendMediaGroup(chatId, renderAlbum(ficha) as any);
  } catch (e) {
    logger.warn('Álbum de exercícios falhou; seguindo só com o texto', { erro: String(e) });
  }
}

/** Publica a ficha do dia: álbum de aparelhos + card com repetições, cargas e botões. */
export async function publishFicha(bot: TelegramBot, chatId: number, userId: number): Promise<boolean> {
  const ficha = await fichaService.buildToday(userId);
  if (!ficha) {
    await bot.sendMessage(chatId, '😴 <b>Hoje é descanso.</b>\nRecuperação também é treino — amanhã tem ficha nova.', { parse_mode: 'HTML' });
    return false;
  }

  await fichaService.saveSession(userId, ficha);
  const [frase, trained, status] = await Promise.all([
    provocacao(ficha),
    workoutService.hasLoggedToday(userId).catch(() => false),
    habitsService.getStatus(userId).catch(() => ({} as Record<string, boolean>)),
  ]);

  await sendAlbum(bot, chatId, ficha);
  if (frase) await bot.sendMessage(chatId, frase);
  await bot.sendMessage(chatId, renderFicha(ficha), {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: mainKeyboard(trained, !!status['cardio']) },
  });
  logger.info(`🏋️ Ficha "${ficha.planKey}" publicada para chat=${chatId}`);
  return true;
}

/**
 * Entrada do cron das 6h (seg-sáb). O lock evita ficha duplicada quando o processo
 * reinicia perto do horário ou quando roda também em modo agendado.
 */
export async function sendDailyFicha(bot: TelegramBot): Promise<void> {
  const chatId = getFichaChatId();
  const userId = getFichaUserId();
  if (!chatId || !userId) {
    logger.error('❌ CHAT_ID/USER_ID não definidos — ficha diária não enviada.');
    return;
  }

  if (redisService.isConnected() && (await redisService.get(LOCK_KEY))) {
    logger.warn('[Ficha] Publicação já em andamento. Pulando.');
    return;
  }
  try {
    if (redisService.isConnected()) await redisService.set(LOCK_KEY, 'locked', LOCK_TTL_S);
    await publishFicha(bot, chatId, userId);
  } catch (e) {
    logger.error('❌ Erro ao publicar a ficha diária:', e);
  } finally {
    if (redisService.isConnected()) await redisService.del(LOCK_KEY);
  }
}
