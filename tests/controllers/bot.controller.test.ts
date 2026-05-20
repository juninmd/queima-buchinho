import TelegramBot from 'node-telegram-bot-api';
import { BotController } from '../../src/controllers/bot.controller';
import { workoutService } from '../../src/services/workout.service';
import { memeService } from '../../src/services/meme.service';
import { metricsService } from '../../src/services/metrics.service';
import { habitsService } from '../../src/services/habits.service';
import { ollamaService } from '../../src/services/ollama.service';
import { myInstantsService } from '../../src/services/myinstants.service';
import { ttsService } from '../../src/services/tts.service';
import { mediaService } from '../../src/services/media.service';
import * as telegramUtils from '../../src/utils/telegram';

jest.mock('../../src/services/workout.service');
jest.mock('../../src/services/meme.service');
jest.mock('../../src/services/metrics.service');
jest.mock('../../src/services/habits.service');
jest.mock('../../src/services/ollama.service');
jest.mock('../../src/services/myinstants.service');
jest.mock('../../src/services/tts.service');
jest.mock('../../src/services/media.service');
jest.mock('../../src/services/redis.service', () => ({
    redisService: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn()
    }
}));
jest.mock('../../src/utils/telegram');

describe('BotController', () => {
    let bot: jest.Mocked<TelegramBot>;
    let botController: BotController;

    beforeEach(() => {
        bot = {
            on: jest.fn(),
            sendMessage: jest.fn().mockResolvedValue({} as any),
            sendAudio: jest.fn().mockResolvedValue({} as any),
            sendChatAction: jest.fn().mockResolvedValue({} as any),
        } as any;
        botController = new BotController(bot);
        jest.clearAllMocks();

        // Default mocks
        (ttsService.generateMikaAudio as jest.Mock).mockResolvedValue('test-audio.mp3');
        (ttsService.cleanup as jest.Mock).mockResolvedValue(undefined);
        (mediaService.sendGif as jest.Mock).mockResolvedValue(null);
        (mediaService.sendSticker as jest.Mock).mockResolvedValue(null);
        (mediaService.searchGifs as jest.Mock).mockResolvedValue([]);
        (mediaService.searchStickers as jest.Mock).mockResolvedValue([]);
        (mediaService.getLocalSticker as jest.Mock).mockResolvedValue(null);
        (mediaService.getLocalImage as jest.Mock).mockResolvedValue(null);
    });

    describe('init', () => {
        it('should setup listeners and commands', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            botController.init();
            expect(bot.on).toHaveBeenCalledWith('message', expect.any(Function));
            expect(bot.on).toHaveBeenCalledWith('channel_post', expect.any(Function));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Bot Queima Buchinho iniciado'));
            consoleSpy.mockRestore();
        });
    });

    describe('message listeners', () => {
        let messageHandler: Function;

        beforeEach(() => {
            botController.init();
            messageHandler = (bot.on as jest.Mock).mock.calls.find(c => c[0] === 'message')[1];
        });

        it('should ignore empty text or commands', async () => {
            await messageHandler({ text: '', from: { id: 123 } });
            await messageHandler({ text: '/start', from: { id: 123 } });
            expect(workoutService.logWorkout).not.toHaveBeenCalled();
        });

        it('should ignore if no userId', async () => {
            await messageHandler({ text: 'treinei' });
            expect(workoutService.logWorkout).not.toHaveBeenCalled();
        });

        it('should log workout and send congrats if keyword matches', async () => {
            (memeService.getCongratsMessage as jest.Mock).mockResolvedValue({ message: 'Parabéns!', audioSearchTerm: 'applause' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'http://audio', title: 'Applause' });

            await messageHandler({ text: 'treinei hoje!', from: { id: 123 }, chat: { id: 456 } });        

            expect(workoutService.logWorkout).toHaveBeenCalledWith(123, true, 'treinei hoje!');
            expect(habitsService.markHabit).toHaveBeenCalledWith(123, 'treino', true);
            expect(telegramUtils.replyMika).toHaveBeenCalledWith(expect.anything(), 456, 'Parabéns!');
        });

        it('should handle channel_post for keywords', async () => {
            const channelHandler = (bot.on as jest.Mock).mock.calls.find(c => c[0] === 'channel_post')[1];
            (memeService.getCongratsMessage as jest.Mock).mockResolvedValue({ message: 'Boa!', audioSearchTerm: null });

            await channelHandler({ text: 'treinei', sender_chat: { id: 789 }, chat: { id: 789 } });       
            expect(workoutService.logWorkout).toHaveBeenCalledWith(789, true, 'treinei');
        });
    });

    describe('commands', () => {
        let commandHandler: Function;

        beforeEach(() => {
            botController.init();
            const handlers = (bot.on as jest.Mock).mock.calls
                .filter(c => c[0] === 'message')
                .map(c => c[1]);

            // handlers[0] is setupListeners, handlers[1] is setupCommands
            commandHandler = handlers[1];
        });

        it('should handle /status', async () => {
            await commandHandler({ text: '/status', chat: { id: 123 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), expect.any(String));
        });

        it('should handle /checktreino - trained', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: true });        
            (memeService.getCongratsMessage as jest.Mock).mockResolvedValue({ message: 'Boa!', audioSearchTerm: 'top' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'top' });

            await commandHandler({ text: '/checktreino', chat: { id: 123 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), 'Boa!');
            expect(bot.sendAudio).toHaveBeenCalled();
        });

        it('should handle /checktreino - not trained', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });       
            (memeService.getRoastMessage as jest.Mock).mockResolvedValue({ message: 'Frango!', audioSearchTerm: 'chicken' });
            (memeService.getRoastAudio as jest.Mock).mockReturnValue('local_audio.mp3');
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'chicken' });

            await commandHandler({ text: '/checktreino', chat: { id: 123 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), 'Frango!');
            expect(bot.sendAudio).toHaveBeenCalled();
        });

        it('should fallback to local roast audio if myinstants fails', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });       
            (memeService.getRoastMessage as jest.Mock).mockResolvedValue({ message: 'Frango!', audioSearchTerm: 'chicken' });
            (memeService.getRoastAudio as jest.Mock).mockReturnValue('local_audio.mp3');
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue(null);

            await commandHandler({ text: '/checktreino', chat: { id: 123 } });
            // Should be called twice: once for replyMika and once for roastAudio if different?
            // Actually replyMika generates tts audio. handleCheckTreino also sends roastAudio.
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalled();
        });

        it('should handle /checktreino error', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockRejectedValue(new Error('Fail'));        
            await commandHandler({ text: '/checktreino', chat: { id: 123 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), expect.stringContaining('Erro no Check-treino'));
        });

        it('should handle /hora', async () => {
            await commandHandler({ text: '/hora', chat: { id: 123 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), expect.stringContaining('Horário de Brasília'));
        });

        it('should handle /motivar', async () => {
            (memeService.getMotivationAudio as jest.Mock).mockReturnValue('motivation.mp3');
            await commandHandler({ text: '/motivar', chat: { id: 123 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, 'motivation.mp3', expect.any(String));
        });

        it('should handle /instante', async () => {
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'title' });
            await commandHandler({ text: '/instante cavalo', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(bot.sendAudio).toHaveBeenCalled();
        });

        it('should handle /instante not found', async () => {
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue(null);
            await commandHandler({ text: '/instante unknown', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Nenhum áudio encontrado'));
        });

        it('should handle /instante error', async () => {
            (myInstantsService.getBestMatchAudio as jest.Mock).mockRejectedValue(new Error('API Error')); 
            await commandHandler({ text: '/instante cavalo', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Erro no MyInstants'));
        });

        it('should handle /reset', async () => {
            await commandHandler({ text: '/reset', chat: { id: 123 }, from: { id: 456, first_name: 'User' } });
            expect(workoutService.resetWorkout).toHaveBeenCalledWith(456);
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), expect.any(String));
        });

        it('should handle /peso', async () => {
            (metricsService.logMetric as jest.Mock).mockResolvedValue(undefined);
            (metricsService.getWeightDiffFromStart as jest.Mock).mockResolvedValue(-2.5);
            (ollamaService.getWeightUpdate as jest.Mock).mockResolvedValue({ message: 'Ótimo!', audioSearchTerm: 'applause' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'title' });

            await commandHandler({ text: '/peso 80.5', chat: { id: 123 }, from: { id: 456, first_name: 'User' } });

            expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'weight', 80.5, 'kg');
            expect(telegramUtils.replyMika).toHaveBeenCalledWith(expect.anything(), 123, 'Ótimo!');
            expect(bot.sendAudio).toHaveBeenCalled();
        });

        it('should handle /peso without ollama response', async () => {
            (metricsService.logMetric as jest.Mock).mockResolvedValue(undefined);
            (metricsService.getWeightDiffFromStart as jest.Mock).mockResolvedValue(-2.5);
            (ollamaService.getWeightUpdate as jest.Mock).mockResolvedValue(null);

            await commandHandler({ text: '/peso 80.5', chat: { id: 123 }, from: { id: 456, first_name: 'User' } });
            expect(telegramUtils.replyMika).toHaveBeenCalledWith(expect.anything(), 123, expect.stringContaining('registrado!'));
        });

        it('should handle channel_post for commands', async () => {
            const channelHandlers = (bot.on as jest.Mock).mock.calls.filter(c => c[0] === 'channel_post').map(c => c[1]);
            const channelHandler = channelHandlers[1];
            await channelHandler({ text: '/status', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalled();
        });

        it('should handle /streak with 0 streak', async () => {
            (workoutService.getStreak as jest.Mock).mockResolvedValue(0);
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue({ message: 'Começa hoje!' });
            await commandHandler({ text: '/streak', chat: { id: 123 }, from: { id: 456 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), 'Começa hoje!');
        });

        it('should handle /streak with 1 streak', async () => {
            (workoutService.getStreak as jest.Mock).mockResolvedValue(1);
            await commandHandler({ text: '/streak', chat: { id: 123 }, from: { id: 456 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), expect.stringContaining('dia 2'));
        });

        it('should handle /streak with high streak', async () => {
            (workoutService.getStreak as jest.Mock).mockResolvedValue(10);
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue({ message: '10 dias incrível!' });
            await commandHandler({ text: '/streak', chat: { id: 123 }, from: { id: 456 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), '10 dias incrível!');
        });

        it('should handle /streak with null ollama fallback', async () => {
            (workoutService.getStreak as jest.Mock).mockResolvedValue(0);
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue(null);
            await commandHandler({ text: '/streak', chat: { id: 123 }, from: { id: 456 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), expect.stringContaining('Zero dias'));
        });

        it('should handle /cardio', async () => {
            (ollamaService.getHabitResponse as jest.Mock).mockResolvedValue({ message: 'Cardio feito!' });
            await commandHandler({ text: '/cardio', chat: { id: 123 }, from: { id: 456 } });
            expect(habitsService.markHabit).toHaveBeenCalledWith(456, 'cardio', true);
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalledWith(expect.anything(), 123, expect.any(String), 'Cardio feito!');
        });

        it('should handle /relatorio with cooldown', async () => {
            // First call sets timestamp
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: true });
            (metricsService.getDailySummary as jest.Mock).mockResolvedValue({ water: 2000, weight: 80 });
            (habitsService.getCompletedCount as jest.Mock).mockResolvedValue({ completed: 5, total: 9 });
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue({ message: 'Relatório!' });
            await commandHandler({ text: '/relatorio', chat: { id: 999 }, from: { id: 456 } });
            // Second call within cooldown
            await commandHandler({ text: '/relatorio', chat: { id: 999 }, from: { id: 456 } });
            expect(bot.sendMessage).toHaveBeenCalledWith(999, expect.stringContaining('Calma'));
        });

        it('should handle /meme random', async () => {
            (mediaService.sendGif as jest.Mock).mockResolvedValue('http://example.com/meme.gif');
            await commandHandler({ text: '/meme', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(telegramUtils.sendGifMessage).toHaveBeenCalled();
        });

        it('should handle /meme with query', async () => {
            (mediaService.searchGifs as jest.Mock).mockResolvedValue([{ url: 'http://example.com/meme.gif' }]);
            await commandHandler({ text: '/meme fitness', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(telegramUtils.sendGifMessage).toHaveBeenCalled();
        });

        it('should handle /meme with query - no results', async () => {
            (mediaService.searchGifs as jest.Mock).mockResolvedValue([]);
            await commandHandler({ text: '/meme noresult', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Não achei'));
        });

        it('should handle /sticker random', async () => {
            (mediaService.sendSticker as jest.Mock).mockResolvedValue('http://example.com/sticker.webp');
            await commandHandler({ text: '/sticker', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(telegramUtils.sendStickerMessage).toHaveBeenCalled();
        });

        it('should handle /sticker with query', async () => {
            (mediaService.searchStickers as jest.Mock).mockResolvedValue([{ url: 'http://example.com/s.webp' }]);
            await commandHandler({ text: '/sticker fire', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(telegramUtils.sendStickerMessage).toHaveBeenCalled();
        });

        it('should handle /gif with query', async () => {
            (mediaService.searchGifs as jest.Mock).mockResolvedValue([{ url: 'http://example.com/anim.gif' }]);
            await commandHandler({ text: '/gif workout', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(telegramUtils.sendGifMessage).toHaveBeenCalled();
        });

        it('should handle /gif with no results', async () => {
            (mediaService.searchGifs as jest.Mock).mockResolvedValue([]);
            await commandHandler({ text: '/gif noresultxyz', chat: { id: 123 }, from: { first_name: 'User' } });
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Não achei'));
        });

        it('should handle /peso with out-of-range value', async () => {
            await commandHandler({ text: '/peso 999', chat: { id: 123 }, from: { id: 456, first_name: 'User' } });
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Valor inválido'));
        });

        it('should handle /gordura metric', async () => {
            (metricsService.logMetric as jest.Mock).mockResolvedValue(undefined);
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue({ message: 'Gordura ok!', audioSearchTerm: null });
            await commandHandler({ text: '/gordura 20', chat: { id: 123 }, from: { id: 456, first_name: 'User' } });
            expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'body_fat', 20, '%');
        });

        it('should handle /musculo metric', async () => {
            (metricsService.logMetric as jest.Mock).mockResolvedValue(undefined);
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue(null);
            await commandHandler({ text: '/musculo 40', chat: { id: 123 }, from: { id: 456, first_name: 'User' } });
            expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'muscle_mass', 40, '%');
        });

        it('should handle /altura metric', async () => {
            (metricsService.logMetric as jest.Mock).mockResolvedValue(undefined);
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue({ message: 'Ok!', audioSearchTerm: null });
            await commandHandler({ text: '/altura 175', chat: { id: 123 }, from: { id: 456, first_name: 'User' } });
            expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'height', 175, 'cm');
        });

        it('should handle /passos metric', async () => {
            (metricsService.logMetric as jest.Mock).mockResolvedValue(undefined);
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue(null);
            await commandHandler({ text: '/passos 8000', chat: { id: 123 }, from: { id: 456, first_name: 'User' } });
            expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'steps', 8000, 'passos');
        });

        it('should handle cardio keyword in message listener', async () => {
            const listeners = (bot.on as jest.Mock).mock.calls.filter(c => c[0] === 'message').map(c => c[1]);
            const msgHandler = listeners[0];
            (ollamaService.getHabitResponse as jest.Mock).mockResolvedValue({ message: 'Cardio!' });
            await msgHandler({ text: 'fiz cardio hoje', from: { id: 123 }, chat: { id: 456 } });
            expect(habitsService.markHabit).toHaveBeenCalledWith(123, 'cardio', true);
        });

        it('should skip workout log if already logged today', async () => {
            const listeners = (bot.on as jest.Mock).mock.calls.filter(c => c[0] === 'message').map(c => c[1]);
            const msgHandler = listeners[0];
            (workoutService.hasLoggedToday as jest.Mock).mockResolvedValue(true);
            await msgHandler({ text: 'treinei', from: { id: 123 }, chat: { id: 456 } });
            expect(bot.sendMessage).toHaveBeenCalledWith(456, expect.stringContaining('Já registrei'));
        });
    });
});
