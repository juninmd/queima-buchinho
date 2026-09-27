import type { InlineKeyboardButton } from 'node-telegram-bot-api';
import { metricsService } from '../../services/metrics.service';
import { METRIC_LIMITS } from '../../config/constants';
import { formatDecimalBR } from '../../utils/number';

export const UNDO_PREFIX = 'undo_metric:';

export interface RecordResult {
  ok: boolean;
  text: string;
  keyboard: InlineKeyboardButton[][];
}

const fmtMl = (n: number): string => Math.round(n).toLocaleString('pt-BR');

/** Valida faixa, grava e devolve a confirmação com botão de desfazer. */
export async function recordMetric(userId: number, type: 'water' | 'weight', value: number): Promise<RecordResult> {
  const limits = METRIC_LIMITS[type];
  if (!Number.isFinite(value) || value < limits.min || value > limits.max) {
    return { ok: false, text: `Valor fora da faixa (${limits.min}–${limits.max} ${limits.unit}). Nada foi registrado.`, keyboard: [] };
  }
  const id = await metricsService.logMetric(userId, type, value, limits.unit);
  if (id === null) {
    return { ok: false, text: '❌ Não consegui salvar agora. Tenta de novo em instantes.', keyboard: [] };
  }
  const keyboard = [[{ text: '↩️ Desfazer', callback_data: `${UNDO_PREFIX}${id}` }]];
  if (type === 'weight') {
    return { ok: true, text: `⚖️ Peso ${formatDecimalBR(value)} kg registrado.`, keyboard };
  }
  const total = await metricsService.getTodaySum(userId, 'water');
  return { ok: true, text: `💧 +${fmtMl(value)}ml registrado. Total hoje: ${fmtMl(total)}ml`, keyboard };
}
