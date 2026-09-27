import TelegramBot from 'node-telegram-bot-api';
import { dashboardService } from '../../services/dashboard.service';
import { metricsService } from '../../services/metrics.service';
import { getBrasiliaDateString } from '../../utils/time';
import { logger } from '../../utils/logger';
import { buildDashboardSvg } from './svg';
import { svgToPng } from './png';
import type { DashboardSnapshot, TodayStats } from './types';

/**
 * A série de 7 dias lê só workout_logs; o ponto de hoje é sobrescrito com os números
 * reconciliados do fechamento para imagem e texto nunca discordarem.
 */
export async function buildSnapshot(userId: number, today: TodayStats): Promise<DashboardSnapshot> {
  const date = getBrasiliaDateString();
  const [week, weight, weightDiff] = await Promise.all([
    dashboardService.getSeries(userId, 7),
    metricsService.getLastWeight(userId).catch(() => null),
    metricsService.getWeightDiffFromStart(userId).catch(() => 0),
  ]);
  const merged = week.map(d => d.date === date
    ? { ...d, trained: today.trained, habitsCompleted: today.habitsCompleted, water: today.water }
    : d);
  return { ...today, date, week: merged, weight, weightDiff };
}

/** Painel complementa o fechamento em texto: falha é logada e nunca derruba o relatório. */
export async function sendDailyDashboard(
  bot: TelegramBot, chatId: number, userId: number, today: TodayStats
): Promise<void> {
  try {
    const png = svgToPng(buildDashboardSvg(await buildSnapshot(userId, today)));
    await bot.sendPhoto(chatId, png, { caption: '📊 Painel do dia' },
      { filename: 'painel-do-dia.png', contentType: 'image/png' });
  } catch (e) {
    logger.error('[DailyDashboard] Falha ao gerar/enviar painel:', e);
  }
}
