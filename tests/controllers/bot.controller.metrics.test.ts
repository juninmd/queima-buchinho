import TelegramBot from 'node-telegram-bot-api';
import { BotController } from '../../src/controllers/bot.controller';
import { metricsService } from '../../src/services/metrics.service';
import { mikaService } from '../../src/services/mika.service';

jest.mock('../../src/services/metrics.service');
jest.mock('../../src/services/workout.service');
jest.mock('../../src/services/habits.service');
jest.mock('../../src/services/mika.service', () => ({
  mikaService: { response: jest.fn().mockResolvedValue({ message: 'LLM Mika' }) },
}));
jest.mock('../../src/utils/telegram');
jest.mock('../../src/features/pause/pause.service');

describe('BotController metrics input (pt-BR numbers)', () => {
  let bot: jest.Mocked<TelegramBot>;
  let commandHandler: (msg: unknown) => Promise<void>;
  let textHandler: (msg: unknown) => Promise<void>;
  const from = { id: 456, first_name: 'User' };

  beforeEach(() => {
    jest.clearAllMocks();
    bot = {
      on: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({}),
      sendChatAction: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<TelegramBot>;
    (metricsService.logMetric as jest.Mock).mockResolvedValue(10);
    (metricsService.getTodaySum as jest.Mock).mockResolvedValue(500);
    (metricsService.getWeightDiffFromStart as jest.Mock).mockResolvedValue(0);
    (metricsService.getLastWeight as jest.Mock).mockResolvedValue(82.4);
    new BotController(bot).init();
    const handlers = (bot.on as jest.Mock).mock.calls.filter(c => c[0] === 'message').map(c => c[1]);
    [textHandler, commandHandler] = handlers;
  });

  it('records "/peso 82,5" as 82.5, not truncated to 82', async () => {
    await commandHandler({ text: '/peso 82,5', chat: { id: 123 }, from });
    expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'weight', 82.5, 'kg');
  });

  it('rejects ambiguous values instead of saving a partial number', async () => {
    await commandHandler({ text: '/peso 82,5kg', chat: { id: 123 }, from });
    await commandHandler({ text: '/gordura 1.234,5', chat: { id: 123 }, from });
    expect(metricsService.logMetric).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('/peso 82,5'));
  });

  it('reads thousand separators in /passos ("10.000" = 10000)', async () => {
    await commandHandler({ text: '/passos 10.000', chat: { id: 123 }, from });
    expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'steps', 10000, 'passos');
  });

  it('opens the weight picker when /peso has no value', async () => {
    await commandHandler({ text: '/peso', chat: { id: 123 }, from });
    expect(metricsService.logMetric).not.toHaveBeenCalled();
    const [, text, opts] = (bot.sendMessage as jest.Mock).mock.calls[0];
    expect(text).toContain('Quanto você pesou hoje');
    expect(opts.reply_markup.inline_keyboard[0]).toHaveLength(5);
  });

  it('logs "bebi 500ml" in private chat without calling the Mika LLM', async () => {
    const msg = { text: 'bebi 500ml', chat: { id: 456, type: 'private' }, from, date: Date.now() / 1000 + 5 };
    await textHandler(msg);
    expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'water', 500, 'ml');
    expect(mikaService.response).not.toHaveBeenCalled();
  });

  it('does not treat group chatter as a quick log', async () => {
    const msg = { text: 'bebi 500ml mika', chat: { id: -100, type: 'group' }, from, date: Date.now() / 1000 + 5 };
    await textHandler(msg);
    expect(metricsService.logMetric).not.toHaveBeenCalled();
  });
});
