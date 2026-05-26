import TelegramBot from 'node-telegram-bot-api';
import { notifyStartup, notifyShutdown, notifyCrash } from '../../src/utils/notifications';

describe('Notifications Utility', () => {
    let bot: jest.Mocked<TelegramBot>;

    beforeEach(() => {
        bot = {
            sendMessage: jest.fn().mockResolvedValue({} as any)
        } as any;
        process.env.CHAT_ID = '123456';
    });

    afterEach(() => {
        delete process.env.CHAT_ID;
    });

    it('should notify startup', async () => {
        await notifyStartup(bot);
        expect(bot.sendMessage).toHaveBeenCalledWith(123456, expect.any(String));
    });

    it('should notify shutdown', async () => {
        await notifyShutdown(bot);
        expect(bot.sendMessage).toHaveBeenCalledWith(123456, expect.stringContaining('Fui!'));
    });

    it('should notify crash', async () => {
        const error = new Error('Test error');
        await notifyCrash(bot, error);
        expect(bot.sendMessage).toHaveBeenCalledWith(123456, expect.stringContaining('Test error'), { parse_mode: 'HTML' });
    });
});
