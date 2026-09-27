import TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { parseIntegerBR } from '../../utils/number';
import { logger } from '../../utils/logger';
import { MAX_PAUSE_DAYS, pauseService } from './pause.service';

const formatDay = (date: string): string => date.split('-').reverse().slice(0, 2).join('/');

/** /pausar [dias]: sem lembretes nem cobranças; a sequência fica congelada. Padrão: 1 dia. */
export async function handlePausar(bot: TelegramBot, msg: Message, match: RegExpExecArray | null): Promise<void> {
  const userId = msg.from?.id || msg.sender_chat?.id;
  if (!userId) return;
  const raw = match?.[2];
  const days = raw === undefined ? 1 : parseIntegerBR(raw);
  if (days === null || days < 1 || days > MAX_PAUSE_DAYS) {
    await bot.sendMessage(msg.chat.id, `Use: /pausar 3 (de 1 a ${MAX_PAUSE_DAYS} dias).`);
    return;
  }
  try {
    const until = await pauseService.pause(userId, days);
    await bot.sendMessage(msg.chat.id,
      `⏸️ Pausado até ${formatDay(until)}. Sem lembretes nem cobranças, e a sequência fica congelada.\n` +
      `Use /voltar para retomar antes.`);
  } catch (e) {
    logger.error('[Pause] Erro ao pausar:', e);
    await bot.sendMessage(msg.chat.id, '❌ Não consegui pausar agora. Tenta de novo em instantes.');
  }
}

export async function handleVoltar(bot: TelegramBot, msg: Message): Promise<void> {
  const userId = msg.from?.id || msg.sender_chat?.id;
  if (!userId) return;
  try {
    const resumed = await pauseService.resume(userId);
    await bot.sendMessage(msg.chat.id, resumed ? '▶️ Voltamos! Lembretes reativados.' : 'Você não estava em pausa.');
  } catch (e) {
    logger.error('[Pause] Erro ao retomar:', e);
    await bot.sendMessage(msg.chat.id, '❌ Não consegui retomar agora. Tenta de novo em instantes.');
  }
}
