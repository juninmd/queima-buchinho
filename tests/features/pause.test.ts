import TelegramBot from 'node-telegram-bot-api';
import { query } from '../../src/config/database';
import { addDays, pauseService } from '../../src/features/pause/pause.service';
import { handlePausar, handleVoltar } from '../../src/features/pause/pause.handler';
import { isOwnerPaused, unlessPaused } from '../../src/features/pause/pause.guard';

jest.mock('../../src/config/database', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
jest.mock('../../src/utils/time', () => ({ getBrasiliaDateString: () => '2026-09-26' }));

const mockQuery = query as jest.Mock;
const msg = (text: string) => ({ text, chat: { id: 1 }, from: { id: 7 } }) as any;
const match = (days?: string) => ['', undefined, days] as unknown as RegExpExecArray;

describe('pause service', () => {
  beforeEach(() => { jest.clearAllMocks(); delete process.env.USER_ID; delete process.env.CHAT_ID; });

  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('pauses from today through today+days-1', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    expect(await pauseService.pause(7, 3)).toBe('2026-09-28');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT'), [7, '2026-09-26', '2026-09-28']);
  });

  it('resume reports whether any pause was active', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0 });
    expect(await pauseService.resume(7)).toBe(false);
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rowCount: 1 });
    expect(await pauseService.resume(7)).toBe(true);
    expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE'), [7, '2026-09-25', '2026-09-26']);
  });

  it('expands paused ranges, clamped to today', async () => {
    mockQuery.mockResolvedValue({ rows: [{ start_date: '2026-09-24', end_date: '2026-09-30' }] });
    expect([...await pauseService.pausedDates(7)]).toEqual(['2026-09-24', '2026-09-25', '2026-09-26']);
  });

  it('/pausar defaults to 1 day and validates the range', async () => {
    const bot = { sendMessage: jest.fn().mockResolvedValue({}) } as unknown as TelegramBot;
    mockQuery.mockResolvedValue({ rows: [] });
    await handlePausar(bot, msg('/pausar'), match());
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [7, '2026-09-26', '2026-09-26']);
    mockQuery.mockClear();
    await handlePausar(bot, msg('/pausar 31'), match('31'));
    await handlePausar(bot, msg('/pausar 0'), match('0'));
    await handlePausar(bot, msg('/pausar x'), match('x'));
    expect(mockQuery).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenLastCalledWith(1, expect.stringContaining('de 1 a 30'));
  });

  it('/voltar tells when there was nothing to resume', async () => {
    const bot = { sendMessage: jest.fn().mockResolvedValue({}) } as unknown as TelegramBot;
    mockQuery.mockResolvedValue({ rowCount: 0 });
    await handleVoltar(bot, msg('/voltar'));
    expect(bot.sendMessage).toHaveBeenCalledWith(1, 'Você não estava em pausa.');
  });

  it('guard skips jobs while the owner is paused', async () => {
    process.env.USER_ID = '7';
    const job = jest.fn().mockResolvedValue(undefined);
    mockQuery.mockResolvedValue({ rows: [{ until: '2026-09-28' }] });
    await unlessPaused('water', job)();
    expect(job).not.toHaveBeenCalled();
    mockQuery.mockResolvedValue({ rows: [{ until: null }] });
    await unlessPaused('water', job)();
    expect(job).toHaveBeenCalledTimes(1);
  });

  it('guard fails open on DB errors so reminders keep working', async () => {
    process.env.USER_ID = '7';
    jest.spyOn(console, 'error').mockImplementation();
    mockQuery.mockRejectedValue(new Error('db down'));
    expect(await isOwnerPaused()).toBe(false);
  });
});
