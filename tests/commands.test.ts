import TelegramBot from 'node-telegram-bot-api';
import { BotController } from '../src/controllers/bot.controller';
import { MenuController } from '../src/controllers/menu.controller';
import { workoutService } from '../src/services/workout.service';
import { habitsService } from '../src/services/habits.service';
import { metricsService } from '../src/services/metrics.service';
import { ollamaService } from '../src/services/ollama.service';
import { ttsService } from '../src/services/tts.service';
import { memeService } from '../src/services/meme.service';

jest.mock('node-telegram-bot-api');
jest.mock('../src/services/workout.service');
jest.mock('../src/services/habits.service');
jest.mock('../src/services/metrics.service');
jest.mock('../src/services/ollama.service');
jest.mock('../src/services/tts.service');
jest.mock('../src/services/meme.service');
jest.mock('../src/services/redis.service', () => ({
    redisService: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn()
    }
}));

describe('Command Handling Tests', () => {
    let bot: jest.Mocked<TelegramBot>;
    let botController: BotController;
    let menuController: MenuController;

    beforeEach(() => {
        jest.clearAllMocks();
        bot = new TelegramBot('token') as jest.Mocked<TelegramBot>;
        botController = new BotController(bot);
        menuController = new MenuController(bot);

        // Mock simple implementations
        bot.onText = jest.fn();
        bot.on = jest.fn();
        bot.sendMessage = jest.fn().mockResolvedValue({} as any);
        bot.sendAudio = jest.fn().mockResolvedValue({} as any);
        bot.sendVoice = jest.fn().mockResolvedValue({} as any);
        bot.sendChatAction = jest.fn().mockResolvedValue({} as any);

        (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });
        (metricsService.getDailySummary as jest.Mock).mockResolvedValue({ water: 0 });
        (metricsService.getTodaySum as jest.Mock).mockResolvedValue(0);
        (habitsService.getCompletedCount as jest.Mock).mockResolvedValue({ completed: 0, total: 5 });
        (habitsService.getStatus as jest.Mock).mockResolvedValue({
            treino: false,
            cardio: false,
            leitura: false,
            meditacao: false,
            agua: false
        });
    });

    it('should register status command via message and channel_post in BotController', async () => {      
        botController.init();
        expect(bot.on).toHaveBeenCalledWith('message', expect.any(Function));
        expect(bot.on).toHaveBeenCalledWith('channel_post', expect.any(Function));

        // Simular a chamada de channel_post pegando todos os handlers registrados
        const channelPostHandlers = (bot.on as jest.Mock).mock.calls
            .filter(call => call[0] === 'channel_post')
            .map(call => call[1]);

        const msg = { text: '/status', chat: { id: 123 }, sender_chat: { id: 456 } } as any;

        // Dispara todos os handlers
        for (const handler of channelPostHandlers) {
            await handler(msg);
        }

        expect(bot.sendMessage).toHaveBeenCalled();
    });

    it('should handle /menu command in MenuController', async () => {
        menuController.init();
        expect(bot.on).toHaveBeenCalledWith('message', expect.any(Function));

        const messageHandler = (bot.on as jest.Mock).mock.calls.find(call => call[0] === 'message')[1];   

        // Simulate a /menu message
        const msg = { text: '/menu', chat: { id: 123 }, from: { id: 456 } } as any;

        await messageHandler(msg);
        
        expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Menu do Dia'), expect.any(Object));
    });
});
