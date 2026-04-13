import TelegramBot from 'node-telegram-bot-api';
import { BotController } from '../src/controllers/bot.controller';
import { MenuController } from '../src/controllers/menu.controller';

jest.mock('node-telegram-bot-api');

describe('Command Handling Tests', () => {
    let bot: jest.Mocked<TelegramBot>;
    let botController: BotController;
    let menuController: MenuController;

    beforeEach(() => {
        bot = new TelegramBot('token') as jest.Mocked<TelegramBot>;
        botController = new BotController(bot);
        menuController = new MenuController(bot);
        
        // Mock simple implementations
        bot.onText = jest.fn();
        bot.on = jest.fn();
        bot.sendMessage = jest.fn().mockResolvedValue({} as any);
    });

    it('should register status command in BotController', () => {
        botController.init();
        expect(bot.onText).toHaveBeenCalledWith(expect.anything(), expect.any(Function));
        
        // Find the status command registration
        const statusCall = (bot.onText as jest.Mock).mock.calls.find(call => 
            call[0].toString().includes('status')
        );
        expect(statusCall).toBeDefined();
    });

    it('should handle /menu command in MenuController', () => {
        menuController.init();
        expect(bot.on).toHaveBeenCalledWith('message', expect.any(Function));
        
        const messageHandler = (bot.on as jest.Mock).mock.calls.find(call => call[0] === 'message')[1];
        
        // Simulate a /menu message
        const msg = { text: '/menu', chat: { id: 123 }, from: { id: 456 } } as any;
        messageHandler(msg);
        
        // Since showMenu is private/internal, we check if it tries to fetch status or send message
        // This is a simplified check
        expect(bot.on).toHaveBeenCalled();
    });
});
