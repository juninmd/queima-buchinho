import TelegramBot from 'node-telegram-bot-api';
import { metricsService } from '../../services/metrics.service';
import { formatDecimalBR } from '../../utils/number';

export const WEIGHT_PICK = 'weight_pick';
export const WEIGHT_SET_PREFIX = 'weight_set:';

/** Cinco opções em torno do último peso (±0,4 kg, passo 0,2): cobre a variação diária comum. */
export function weightOptions(last: number): number[] {
  return [-0.4, -0.2, 0, 0.2, 0.4].map(d => Math.round((last + d) * 10) / 10);
}

export async function showWeightPicker(bot: TelegramBot, chatId: number, userId: number): Promise<void> {
  const last = await metricsService.getLastWeight(userId).catch(() => null);
  if (last === null) {
    await bot.sendMessage(chatId, '⚖️ Envie seu peso assim: /peso 82,5');
    return;
  }
  const buttons = weightOptions(last).map(v => ({
    text: formatDecimalBR(v),
    callback_data: `${WEIGHT_SET_PREFIX}${v.toFixed(1)}`,
  }));
  await bot.sendMessage(chatId,
    `⚖️ <b>Quanto você pesou hoje?</b>\nÚltimo registro: ${formatDecimalBR(last)} kg\nOutro valor: /peso 82,5`,
    { parse_mode: 'HTML', reply_markup: { inline_keyboard: [buttons] } });
}
