import TelegramBot from 'node-telegram-bot-api';
import { SchedulerService } from '../../src/services/scheduler.service';
import { workoutService } from '../../src/services/workout.service';
import { memeService } from '../../src/services/meme.service';
import { habitsService } from '../../src/services/habits.service';
import { ollamaService } from '../../src/services/ollama.service';
import { myInstantsService } from '../../src/services/myinstants.service';
import { sendAudioMessage } from '../../src/utils/telegram';
import { redisService } from '../../src/services/redis.service';
import { ttsService } from '../../src/services/tts.service';

jest.mock('../../src/services/workout.service');
jest.mock('../../src/services/meme.service');
jest.mock('../../src/services/habits.service');
jest.mock('../../src/services/ollama.service');
jest.mock('../../src/services/myinstants.service');
jest.mock('../../src/utils/telegram');
jest.mock('../../src/services/redis.service');
jest.mock('../../src/services/tts.service');

describe('SchedulerService', () => {
    let scheduler: SchedulerService;
    let mockBot: jest.Mocked<TelegramBot>;
    const chatId = 123456;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.CHAT_ID = chatId.toString();
        mockBot = {
            sendMessage: jest.fn().mockResolvedValue({}),
            sendAudio: jest.fn().mockResolvedValue({}),
            sendVoice: jest.fn().mockResolvedValue({}),
        } as unknown as jest.Mocked<TelegramBot>;
        scheduler = new SchedulerService(mockBot);

        (redisService.get as jest.Mock).mockResolvedValue(null);
        (ttsService.generateMikaAudio as jest.Mock).mockResolvedValue('mock/audio/path.mp3');
    });

    afterEach(() => {
        delete process.env.CHAT_ID;
    });

    describe('getChatId', () => {
        it('should return chatId from env', () => {
            expect((scheduler as any).getChatId()).toBe(chatId);
        });

        it('should return null and log error if CHAT_ID is not defined', () => {
            delete process.env.CHAT_ID;
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            expect((scheduler as any).getChatId()).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('CHAT_ID não definido'));
            consoleSpy.mockRestore();
        });
    });

    describe('runDailyCheck', () => {
        it('should handle trained user', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: true, message: { text: 'I trained!' } });
            (memeService.getCongratsMessage as jest.Mock).mockResolvedValue({ message: 'Congrats!', audioSearchTerm: 'applause' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'http://audio.url', title: 'Applause' });

            await scheduler.runDailyCheck();

            expect(workoutService.logWorkout).toHaveBeenCalledWith(chatId, true, 'I trained!');
            expect(sendAudioMessage).toHaveBeenCalledWith(mockBot, chatId, expect.any(String), 'Congrats!', undefined);
            expect(mockBot.sendAudio).toHaveBeenCalledWith(chatId, 'http://audio.url', expect.any(Object));
        });

        it('should handle untrained user with instant audio', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });       
            (memeService.getRoastMessage as jest.Mock).mockResolvedValue({ message: 'Roast!', audioSearchTerm: 'sad' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'http://sad.url', title: 'Sad' });

            await scheduler.runDailyCheck();

            expect(workoutService.logWorkout).toHaveBeenCalledWith(chatId, false);
            expect(sendAudioMessage).toHaveBeenCalledWith(mockBot, chatId, expect.any(String), 'Roast!', expect.any(Object));
            expect(mockBot.sendAudio).toHaveBeenCalledWith(chatId, 'http://sad.url', expect.any(Object));   
        });
    });

    describe('sendMorningReminder', () => {
        it('should send morning reminder', async () => {
            (memeService.getMorningReminder as jest.Mock).mockResolvedValue({ message: 'Good morning!', audioSearchTerm: 'sunny' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'http://sunny.url', title: 'Sunny' });

            await scheduler.sendMorningReminder();

            expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, expect.any(String), expect.any(Object));
            expect(sendAudioMessage).toHaveBeenCalledWith(mockBot, chatId, expect.any(String), 'Good morning!', undefined);
        });
    });

    describe('sendConditionalReminder', () => {
        it('should send reminder if not trained', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });       
            (memeService.getConditionalReminder as jest.Mock).mockResolvedValue({ message: 'Train now!' });

            await scheduler.sendConditionalReminder();

            expect(sendAudioMessage).toHaveBeenCalledWith(mockBot, chatId, expect.any(String), 'Train now!', expect.any(Object));
        });
    });

    describe('sendWaterReminder', () => {
        it('should send water reminder', async () => {
            (memeService.getWaterReminder as jest.Mock).mockResolvedValue({ message: 'Drink water!' });   
            await scheduler.sendWaterReminder();
            expect(sendAudioMessage).toHaveBeenCalledWith(mockBot, chatId, expect.any(String), 'Drink water!', expect.any(Object));
        });
    });

    describe('sendFoodReminder', () => {
        it('should send food reminder', async () => {
            (memeService.getFoodReminder as jest.Mock).mockResolvedValue({ message: 'Eat healthy!' });    
            await scheduler.sendFoodReminder('almoco');
            expect(sendAudioMessage).toHaveBeenCalledWith(mockBot, chatId, expect.any(String), expect.stringContaining('HORA DO ALMOCO'), expect.any(Object));
        });
    });

    describe('sendHabitsCheckReminder', () => {
        it('should congratulate if all habits done', async () => {
            (habitsService.getUncompletedHabits as jest.Mock).mockResolvedValue([]);
            (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue({ message: 'Parabéns!' });
            await scheduler.sendHabitsCheckReminder();
            expect(sendAudioMessage).toHaveBeenCalledWith(mockBot, chatId, expect.any(String), expect.stringContaining('Parabéns!'), undefined);
        });

        it('should send reminder if habits pending', async () => {
            (habitsService.getUncompletedHabits as jest.Mock).mockResolvedValue(['treino', 'leitura']);   
            (ollamaService.getHabitsCheckReminder as jest.Mock).mockResolvedValue({ message: 'Do your habits!' });

            await scheduler.sendHabitsCheckReminder();

            expect(sendAudioMessage).toHaveBeenCalledWith(mockBot, chatId, expect.any(String), 'Do your habits!', expect.any(Object));
        });
    });
});
