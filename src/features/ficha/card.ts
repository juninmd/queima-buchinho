import TelegramBot from 'node-telegram-bot-api';
import type { InlineKeyboardButton } from 'node-telegram-bot-api';
import { habitsService } from '../../services/habits.service';
import { workoutService } from '../../services/workout.service';
import { logger } from '../../utils/logger';
import { fichaService } from './ficha.service';
import { mainKeyboard, renderFicha } from './render';

export interface CardStatus {
  trained: boolean;
  cardioDone: boolean;
}

/** Estado dos dois botões de conclusão. Falha de leitura vira "não feito", nunca exceção. */
export async function currentStatus(userId: number): Promise<CardStatus> {
  const [trained, status] = await Promise.all([
    workoutService.hasLoggedToday(userId).catch(() => false),
    habitsService.getStatus(userId).catch(() => ({} as Record<string, boolean>)),
  ]);
  return { trained, cardioDone: !!status['cardio'] };
}

/** Troca só o teclado, para navegação entre telas que não muda o texto da ficha. */
export async function setKeyboard(
  bot: TelegramBot, chatId: number, messageId: number, keyboard: InlineKeyboardButton[][]
): Promise<void> {
  await bot
    .editMessageReplyMarkup({ inline_keyboard: keyboard }, { chat_id: chatId, message_id: messageId })
    .catch(() => {});
}

/**
 * Redesenha o card inteiro a partir da ficha recém-lida do banco. Texto e teclado saem
 * sempre da mesma leitura: qualquer caminho que altere carga, progressão ou deload passa
 * por aqui, e nenhum toque devolve um card com carga velha e badge novo.
 */
export async function refreshCard(
  bot: TelegramBot, userId: number, chatId: number, messageId: number
): Promise<void> {
  const ficha = await fichaService.buildToday(userId);
  if (!ficha) return;
  const { trained, cardioDone } = await currentStatus(userId);
  try {
    await bot.editMessageText(renderFicha(ficha), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: mainKeyboard(ficha, trained, cardioDone) },
    });
  } catch (e) {
    logger.warn('Não foi possível atualizar o card da ficha', { erro: String(e) });
  }
}
