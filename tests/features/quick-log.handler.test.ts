import TelegramBot from 'node-telegram-bot-api';
import type { CallbackQuery } from 'node-telegram-bot-api';
import { handleQuickLog, handleQuickLogCallback, handlesQuickLogCallback } from '../../src/features/quick-log/quick-log.handler';
import { weightOptions } from '../../src/features/quick-log/weight-picker';
import { metricsService } from '../../src/services/metrics.service';

jest.mock('../../src/services/metrics.service');

const makeBot = () => ({
  sendMessage: jest.fn().mockResolvedValue({}),
  answerCallbackQuery: jest.fn().mockResolvedValue(true),
  editMessageText: jest.fn().mockResolvedValue({}),
}) as unknown as jest.Mocked<TelegramBot>;

const cb = (data: string, userId = 7): CallbackQuery =>
  ({ id: 'q1', data, from: { id: userId }, message: { chat: { id: 99 }, message_id: 5 } } as unknown as CallbackQuery);

describe('quick log', () => {
  let bot: jest.Mocked<TelegramBot>;
  beforeEach(() => {
    jest.clearAllMocks();
    bot = makeBot();
    (metricsService.logMetric as jest.Mock).mockResolvedValue(42);
    (metricsService.getTodaySum as jest.Mock).mockResolvedValue(1500);
  });

  it('records water and offers an undo bound to the inserted row', async () => {
    expect(await handleQuickLog(bot, 99, 7, 'bebi 500ml')).toBe(true);
    expect(metricsService.logMetric).toHaveBeenCalledWith(7, 'water', 500, 'ml');
    const [, text, opts] = (bot.sendMessage as jest.Mock).mock.calls[0];
    expect(text).toContain('Total hoje: 1.500ml');
    expect(opts.reply_markup.inline_keyboard[0][0].callback_data).toBe('undo_metric:42');
  });

  it('refuses out-of-range values without writing', async () => {
    await handleQuickLog(bot, 99, 7, 'bebi 9 litros');
    await handleQuickLog(bot, 99, 7, 'pesei 999');
    expect(metricsService.logMetric).not.toHaveBeenCalled();
    expect((bot.sendMessage as jest.Mock).mock.calls[0][1]).toContain('fora da faixa');
  });

  it('reports a DB failure instead of claiming success', async () => {
    (metricsService.logMetric as jest.Mock).mockResolvedValue(null);
    await handleQuickLog(bot, 99, 7, 'pesei 82,5');
    expect((bot.sendMessage as jest.Mock).mock.calls[0][1]).toContain('Não consegui salvar');
  });

  it('asks for confirmation before marking a workout (no silent side effects)', async () => {
    await handleQuickLog(bot, 99, 7, 'treinei');
    expect(metricsService.logMetric).not.toHaveBeenCalled();
    const opts = (bot.sendMessage as jest.Mock).mock.calls[0][2];
    expect(opts.reply_markup.inline_keyboard[0][0].callback_data).toBe('mark_trained');
  });

  it('returns false for regular conversation', async () => {
    expect(await handleQuickLog(bot, 99, 7, 'oi mika')).toBe(false);
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });
});

describe('quick log callbacks', () => {
  let bot: jest.Mocked<TelegramBot>;
  beforeEach(() => {
    jest.clearAllMocks();
    bot = makeBot();
    (metricsService.logMetric as jest.Mock).mockResolvedValue(42);
  });

  it('routes only its own prefixes', () => {
    expect(handlesQuickLogCallback('weight_pick')).toBe(true);
    expect(handlesQuickLogCallback('weight_set:82.4')).toBe(true);
    expect(handlesQuickLogCallback('undo_metric:1')).toBe(true);
    expect(handlesQuickLogCallback('add_water_250')).toBe(false);
  });

  it('undo deletes scoped to the clicking user, so a forged id cannot touch others', async () => {
    (metricsService.deleteMetric as jest.Mock).mockResolvedValue(true);
    await handleQuickLogCallback(bot, cb('undo_metric:42', 7));
    expect(metricsService.deleteMetric).toHaveBeenCalledWith(7, 42);
    expect(bot.editMessageText).toHaveBeenCalledWith('↩️ Registro desfeito.', expect.anything());
  });

  it('ignores malformed undo ids', async () => {
    await handleQuickLogCallback(bot, cb('undo_metric:1;DROP'));
    expect(metricsService.deleteMetric).not.toHaveBeenCalled();
    expect(bot.answerCallbackQuery).toHaveBeenCalledWith('q1', { text: 'Nada para desfazer' });
  });

  it('weight_set validates forged values before writing', async () => {
    await handleQuickLogCallback(bot, cb('weight_set:9999'));
    await handleQuickLogCallback(bot, cb('weight_set:abc'));
    expect(metricsService.logMetric).not.toHaveBeenCalled();
    await handleQuickLogCallback(bot, cb('weight_set:82.4'));
    expect(metricsService.logMetric).toHaveBeenCalledWith(7, 'weight', 82.4, 'kg');
  });

  it('weight options surround the last weight in 0.2 kg steps', () => {
    expect(weightOptions(82.4)).toEqual([82, 82.2, 82.4, 82.6, 82.8]);
  });

  it('asks for the command when there is no previous weight', async () => {
    (metricsService.getLastWeight as jest.Mock).mockResolvedValue(null);
    await handleQuickLogCallback(bot, cb('weight_pick'));
    expect((bot.sendMessage as jest.Mock).mock.calls[0][1]).toContain('/peso 82,5');
  });
});
