import TelegramBot from 'node-telegram-bot-api';
import { BOT_COMMANDS, registerBotCommands } from '../../src/config/commands';

describe('bot commands registry', () => {
  it('uses names Telegram accepts (lowercase, ≤32 chars) and short descriptions', () => {
    const names = BOT_COMMANDS.map(c => c.command);
    expect(new Set(names).size).toBe(names.length);
    BOT_COMMANDS.forEach(c => {
      expect(c.command).toMatch(/^[a-z0-9_]{1,32}$/);
      expect(c.description.length).toBeGreaterThanOrEqual(3);
      expect(c.description.length).toBeLessThanOrEqual(256);
    });
  });

  it('registers the list and survives an API failure', async () => {
    const ok = { setMyCommands: jest.fn().mockResolvedValue(true) } as unknown as TelegramBot;
    await registerBotCommands(ok);
    expect(ok.setMyCommands).toHaveBeenCalledWith(BOT_COMMANDS);

    jest.spyOn(console, 'error').mockImplementation();
    const failing = { setMyCommands: jest.fn().mockRejectedValue(new Error('401')) } as unknown as TelegramBot;
    await expect(registerBotCommands(failing)).resolves.toBeUndefined();
  });
});
