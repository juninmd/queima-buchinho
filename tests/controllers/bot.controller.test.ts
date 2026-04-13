import TelegramBot from 'node-telegram-bot-api';
import { BotController } from '../../src/controllers/bot.controller';
import { workoutService } from '../../src/services/workout.service';
import { memeService } from '../../src/services/meme.service';
import { metricsService } from '../../src/services/metrics.service';
import { habitsService } from '../../src/services/habits.service';
import { ollamaService } from '../../src/services/ollama.service';
import { myInstantsService } from '../../src/services/myinstants.service';
import * as telegramUtils from '../../src/utils/telegram';

jest.mock('../../src/services/workout.service');
jest.mock('../../src/services/meme.service');
jest.mock('../../src/services/metrics.service');
jest.mock('../../src/services/habits.service');
jest.mock('../../src/services/ollama.service');
jest.mock('../../src/services/myinstants.service');
jest.mock('../../src/utils/telegram');

describe('BotController', () => {
    let bot: jest.Mocked<TelegramBot>;
    let botController: BotController;

    beforeEach(() => {
        bot = {
            on: jest.fn(),
            sendMessage: jest.fn().mockResolvedValue({} as any),
            sendAudio: jest.fn().mockResolvedValue({} as any),
        } as any;
        botController = new BotController(bot);
        jest.clearAllMocks();
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
            expect(bot.sendMessage).toHaveBeenCalledWith(456, 'Parabéns!');
            expect(bot.sendAudio).toHaveBeenCalled();
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
            
            commandHandler = handlers[1];
        });

        it('should handle /status', async () => {
            await commandHandler({ text: '/status', chat: { id: 123 } });
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.any(String));
        });

        it('should handle /checktreino - trained', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: true });
            (memeService.getCongratsMessage as jest.Mock).mockResolvedValue({ message: 'Boa!', audioSearchTerm: 'top' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'top' });

            commandHandler({ text: '/checktreino', chat: { id: 123 } });
            await new Promise(r => setTimeout(r, 10));
            expect(bot.sendMessage).toHaveBeenCalledWith(123, 'Boa!');
            expect(bot.sendAudio).toHaveBeenCalled();
        });

        it('should handle /checktreino - not trained', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });
            (memeService.getRoastMessage as jest.Mock).mockResolvedValue({ message: 'Frango!', audioSearchTerm: 'chicken' });
            (memeService.getRoastAudio as jest.Mock).mockReturnValue('local_audio.mp3');
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'chicken' });

            commandHandler({ text: '/checktreino', chat: { id: 123 } });
            await new Promise(r => setTimeout(r, 10));
            expect(bot.sendMessage).toHaveBeenCalledWith(123, 'Frango!');
            expect(bot.sendAudio).toHaveBeenCalled();
        });

        it('should fallback to local roast audio if myinstants fails', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });
            (memeService.getRoastMessage as jest.Mock).mockResolvedValue({ message: 'Frango!', audioSearchTerm: 'chicken' });
            (memeService.getRoastAudio as jest.Mock).mockReturnValue('local_audio.mp3');
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue(null);

            commandHandler({ text: '/checktreino', chat: { id: 123 } });
            await new Promise(r => setTimeout(r, 10));
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalled();
        });

        it('should handle /checktreino error', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockRejectedValue(new Error('Fail'));
            commandHandler({ text: '/checktreino', chat: { id: 123 } });
            await new Promise(r => setTimeout(r, 10));
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Erro ao processar'));
        });

        it('should handle /hora', async () => {
            await commandHandler({ text: '/hora', chat: { id: 123 } });
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Horário de Brasília'));
        });

        it('should handle /motivar', async () => {
            (memeService.getMotivationAudio as jest.Mock).mockReturnValue('motivation.mp3');
            await commandHandler({ text: '/motivar', chat: { id: 123 } });
            expect(telegramUtils.sendAudioMessage).toHaveBeenCalled();
        });

        it('should handle /instante', async () => {
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'title' });
            commandHandler({ text: '/instante cavalo', chat: { id: 123 } });
            await new Promise(r => setTimeout(r, 10));
            expect(bot.sendAudio).toHaveBeenCalled();
        });

        it('should handle /instante not found', async () => {
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue(null);
            commandHandler({ text: '/instante unknown', chat: { id: 123 } });
            await new Promise(r => setTimeout(r, 10));
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Nenhum áudio encontrado'));
        });

        it('should handle /instante error', async () => {
            (myInstantsService.getBestMatchAudio as jest.Mock).mockRejectedValue(new Error('API Error'));
            commandHandler({ text: '/instante cavalo', chat: { id: 123 } });
            await new Promise(r => setTimeout(r, 10));
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Erro ao buscar áudio'));
        });

        it('should handle /reset', async () => {
            await commandHandler({ text: '/reset', chat: { id: 123 }, from: { id: 456 } });
            expect(workoutService.resetWorkout).toHaveBeenCalledWith(456);
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.any(String));
        });

        it('should handle /peso', async () => {
            (metricsService.logMetric as jest.Mock).mockResolvedValue(undefined);
            (metricsService.getWeightDiffFromStart as jest.Mock).mockResolvedValue(-2.5);
            (ollamaService.getWeightUpdate as jest.Mock).mockResolvedValue({ message: 'Ótimo!', audioSearchTerm: 'applause' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'title' });

            commandHandler({ text: '/peso 80.5', chat: { id: 123 }, from: { id: 456 } });
            await new Promise(r => setTimeout(r, 10));
            
            expect(metricsService.logMetric).toHaveBeenCalledWith(456, 'weight', 80.5, 'kg');
            expect(bot.sendMessage).toHaveBeenCalledWith(123, 'Ótimo!');
            expect(bot.sendAudio).toHaveBeenCalled();
        });

        it('should handle /peso without ollama response', async () => {
            (metricsService.logMetric as jest.Mock).mockResolvedValue(undefined);
            (metricsService.getWeightDiffFromStart as jest.Mock).mockResolvedValue(-2.5);
            (ollamaService.getWeightUpdate as jest.Mock).mockResolvedValue(null);

            commandHandler({ text: '/peso 80.5', chat: { id: 123 }, from: { id: 456 } });
            await new Promise(r => setTimeout(r, 10));
            expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('registrado com sucesso'));
        });

        it('should handle channel_post for commands', async () => {
            const channelHandlers = (bot.on as jest.Mock).mock.calls.filter(c => c[0] === 'channel_post').map(c => c[1]);
            // The second channel_post handler is setupCommands
            const channelHandler = channelHandlers[1];
            await channelHandler({ text: '/status', chat: { id: 123 } });
            expect(bot.sendMessage).toHaveBeenCalled();
        });
    });
});
