import TelegramBot from 'node-telegram-bot-api';
import { buildSnapshot, sendDailyDashboard } from '../../src/features/daily-dashboard/dashboard.publisher';
import { dashboardService } from '../../src/services/dashboard.service';
import { metricsService } from '../../src/services/metrics.service';
import { logger } from '../../src/utils/logger';
import type { TodayStats } from '../../src/features/daily-dashboard/types';

jest.mock('../../src/services/dashboard.service');
jest.mock('../../src/services/metrics.service');
jest.mock('../../src/utils/time', () => ({ getBrasiliaDateString: () => '2026-09-25' }));

const today: TodayStats = {
  dayName: 'sexta-feira', habitsCompleted: 7, habitsTotal: 12, water: 1800, waterGoal: 2000,
  trained: true, cardio: true, streak: 2, nota: 8,
};
const point = (date: string, trained: boolean) =>
  ({ date, water: 500, weight: null, trained, habitsCompleted: 1, habitsTotal: 12 });

describe('daily dashboard publisher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (dashboardService.getSeries as jest.Mock).mockResolvedValue([point('2026-09-24', false), point('2026-09-25', false)]);
    (metricsService.getLastWeight as jest.Mock).mockResolvedValue(81.2);
    (metricsService.getWeightDiffFromStart as jest.Mock).mockResolvedValue(-2);
  });

  it("overrides today's point with the reconciled report numbers, keeping past days untouched", async () => {
    const snap = await buildSnapshot(99, today);
    expect(dashboardService.getSeries).toHaveBeenCalledWith(99, 7);
    expect(snap.week[1]).toMatchObject({ trained: true, habitsCompleted: 7, water: 1800 });
    expect(snap.week[0]).toMatchObject({ trained: false, habitsCompleted: 1, water: 500 });
    expect(snap).toMatchObject({ date: '2026-09-25', weight: 81.2, weightDiff: -2 });
  });

  it('still builds when weight lookups fail', async () => {
    (metricsService.getLastWeight as jest.Mock).mockRejectedValue(new Error('db'));
    (metricsService.getWeightDiffFromStart as jest.Mock).mockRejectedValue(new Error('db'));
    const snap = await buildSnapshot(99, today);
    expect(snap).toMatchObject({ weight: null, weightDiff: 0 });
  });

  it('sends a PNG photo to the delivery chat', async () => {
    const bot = { sendPhoto: jest.fn().mockResolvedValue({}) } as unknown as TelegramBot;
    await sendDailyDashboard(bot, -100, 99, today);
    const [chatId, photo, opts, fileOpts] = (bot.sendPhoto as jest.Mock).mock.calls[0];
    expect(chatId).toBe(-100);
    expect(Buffer.isBuffer(photo)).toBe(true);
    expect(opts.caption).toContain('Painel do dia');
    expect(fileOpts).toMatchObject({ contentType: 'image/png' });
  });

  it('logs and does not throw when Telegram rejects, so the report continues', async () => {
    const errSpy = jest.spyOn(logger, 'error').mockImplementation();
    const bot = { sendPhoto: jest.fn().mockRejectedValue(new Error('429')) } as unknown as TelegramBot;
    await expect(sendDailyDashboard(bot, -100, 99, today)).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('DailyDashboard'), expect.any(Error));
  });
});
