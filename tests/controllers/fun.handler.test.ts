import TelegramBot from 'node-telegram-bot-api';
import { handleCantada } from '../../src/controllers/handlers/fun.handler';
import { replyMika } from '../../src/utils/telegram';

jest.mock('../../src/utils/telegram', () => ({
    replyMika: jest.fn().mockResolvedValue(undefined)
}));

describe('Fun Handler', () => {
    let bot: jest.Mocked<TelegramBot>;

    beforeEach(() => {
        bot = {} as any;
        jest.clearAllMocks();
    });

    it('should reply with a cheesy gym pick-up line', async () => {
        const msg = { chat: { id: 123 } } as any;
        await handleCantada(bot, msg);
        expect(replyMika).toHaveBeenCalledWith(bot, 123, expect.any(String));
    });
});
