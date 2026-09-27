import TelegramBot from 'node-telegram-bot-api';
import type { CallbackQuery, InlineKeyboardButton } from 'node-telegram-bot-api';
import { metricsService } from '../../services/metrics.service';
import { parseDecimalBR } from '../../utils/number';
import { parseQuickLog } from './parser';
import { recordMetric, UNDO_PREFIX } from './record';
import { showWeightPicker, WEIGHT_PICK, WEIGHT_SET_PREFIX } from './weight-picker';

/** Texto livre ("bebi 500ml", "pesei 82,5"). Retorna false quando não é registro. */
export async function handleQuickLog(bot: TelegramBot, chatId: number, userId: number, text: string): Promise<boolean> {
  const log = parseQuickLog(text);
  if (!log) return false;

  if (log.kind === 'workout' || log.kind === 'cardio') {
    // Treino/cárdio têm efeitos colaterais (streak, ficha): confirmação explícita por botão.
    const button = log.kind === 'workout'
      ? { text: '🏋️‍♂️ Marcar treino de hoje', callback_data: 'mark_trained' }
      : { text: '🏃 Marcar cárdio de hoje', callback_data: 'mark_cardio' };
    await bot.sendMessage(chatId, 'Confirma o registro?', { reply_markup: { inline_keyboard: [[button]] } });
    return true;
  }

  const result = log.kind === 'water'
    ? await recordMetric(userId, 'water', log.ml)
    : await recordMetric(userId, 'weight', log.kg);
  await bot.sendMessage(chatId, result.text, { reply_markup: { inline_keyboard: result.keyboard } });
  return true;
}

export const handlesQuickLogCallback = (data: string): boolean =>
  data === WEIGHT_PICK || data.startsWith(WEIGHT_SET_PREFIX) || data.startsWith(UNDO_PREFIX);

async function editResult(bot: TelegramBot, query: CallbackQuery, text: string, keyboard: InlineKeyboardButton[][]) {
  const message = query.message;
  if (!message) return;
  await bot.editMessageText(text, {
    chat_id: message.chat.id, message_id: message.message_id, reply_markup: { inline_keyboard: keyboard },
  }).catch(() => {});
}

export async function handleQuickLogCallback(bot: TelegramBot, query: CallbackQuery): Promise<void> {
  const data = query.data ?? '';
  const userId = query.from.id;
  const chatId = query.message?.chat.id;

  if (data === WEIGHT_PICK) {
    await bot.answerCallbackQuery(query.id).catch(() => {});
    if (chatId) await showWeightPicker(bot, chatId, userId);
    return;
  }

  if (data.startsWith(WEIGHT_SET_PREFIX)) {
    const kg = parseDecimalBR(data.slice(WEIGHT_SET_PREFIX.length));
    const result = kg === null
      ? { ok: false, text: 'Valor inválido.', keyboard: [] }
      : await recordMetric(userId, 'weight', kg);
    await bot.answerCallbackQuery(query.id, { text: result.ok ? '⚖️ Registrado!' : result.text }).catch(() => {});
    if (result.ok) await editResult(bot, query, result.text, result.keyboard);
    return;
  }

  const raw = data.slice(UNDO_PREFIX.length);
  const undone = /^\d{1,12}$/.test(raw) && await metricsService.deleteMetric(userId, Number(raw));
  await bot.answerCallbackQuery(query.id, { text: undone ? '↩️ Desfeito' : 'Nada para desfazer' }).catch(() => {});
  if (undone) await editResult(bot, query, '↩️ Registro desfeito.', []);
}
