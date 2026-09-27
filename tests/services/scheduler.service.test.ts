import TelegramBot from 'node-telegram-bot-api';
import { SchedulerService } from '../../src/services/scheduler.service';
import { workoutService } from '../../src/services/workout.service';
import { memeService } from '../../src/services/meme.service';
import { habitsService } from '../../src/services/habits.service';
import { metricsService } from '../../src/services/metrics.service';
import { ollamaService } from '../../src/services/ollama.service';
import { myInstantsService } from '../../src/services/myinstants.service';
import { redisService } from '../../src/services/redis.service';
import { ttsService } from '../../src/services/tts.service';
import { HABITS } from '../../src/config/habits';
import { MenuController } from '../../src/controllers/menu.controller';
import { sendGifMessage } from '../../src/utils/telegram';
import { sendDailyDashboard } from '../../src/features/daily-dashboard/dashboard.publisher';

jest.mock('../../src/services/workout.service');
jest.mock('../../src/services/meme.service');
jest.mock('../../src/services/habits.service');
jest.mock('../../src/services/metrics.service');
jest.mock('../../src/services/ollama.service');
jest.mock('../../src/services/mika.service', () => ({
    mikaService: { response: jest.fn().mockResolvedValue({ message: 'LLM Mika', audioSearchTerm: 'tone' }) }
}));
jest.mock('../../src/services/myinstants.service');
jest.mock('../../src/utils/telegram');
jest.mock('../../src/services/redis.service');
jest.mock('../../src/services/tts.service');
jest.mock('../../src/services/media.service');
jest.mock('../../src/features/daily-dashboard/dashboard.publisher');

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
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: true });
            (memeService.getCongratsMessage as jest.Mock).mockResolvedValue({ message: 'Congrats!', audioSearchTerm: 'applause' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'http://audio.url', title: 'Applause' });

            await scheduler.runDailyCheck();

            expect(workoutService.logWorkout).not.toHaveBeenCalledWith(chatId, true, expect.anything());
            // Aviso é só texto: parabeniza via sendMessage, sem áudio.
            expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, 'Congrats!', undefined);
            expect(mockBot.sendAudio).not.toHaveBeenCalled();
        });

        it('should handle untrained user with text roast and action buttons', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });
            (memeService.getRoastMessage as jest.Mock).mockResolvedValue({ message: 'Roast!', audioSearchTerm: 'sad' });

            await scheduler.runDailyCheck();

            expect(workoutService.logWorkout).toHaveBeenCalledWith(chatId, false);
            // Cobrança é só texto, com botões de treino/cárdio. Sem áudio.
            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                chatId,
                'Roast!',
                expect.objectContaining({ reply_markup: expect.any(Object) })
            );
            expect(mockBot.sendAudio).not.toHaveBeenCalled();
        });
    });

    describe('sendMorningReminder', () => {
        it('should send morning reminder', async () => {
            (memeService.getMorningReminder as jest.Mock).mockResolvedValue({ message: 'Good morning!', audioSearchTerm: 'sunny' });
            (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'http://sunny.url', title: 'Sunny' });

            await scheduler.sendMorningReminder();

            // Cardápio (com teclado) + lembrete da Mika, ambos só texto.
            expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, expect.any(String), expect.any(Object));
            expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, 'Good morning!', undefined);
        });
    });

    describe('sendConditionalReminder', () => {
        it('should send reminder if not trained', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });       
            (memeService.getConditionalReminder as jest.Mock).mockResolvedValue({ message: 'Train now!' });

            await scheduler.sendConditionalReminder();

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                chatId,
                'Train now!',
                expect.objectContaining({ reply_markup: expect.any(Object) })
            );
        });
    });

    describe('sendWaterReminder', () => {
        // 14h BRT: meta proporcional = 58% de 2000ml (1167ml). Só o relógio é falso.
        beforeEach(() => jest.useFakeTimers({ now: new Date('2026-09-26T17:00:00Z'), doNotFake: ['setTimeout', 'clearTimeout', 'setImmediate', 'nextTick'] }));
        afterEach(() => jest.useRealTimers());

        it('skips the reminder when water intake is on pace', async () => {
            (metricsService.getTodaySum as jest.Mock).mockResolvedValue(1200);
            await scheduler.sendWaterReminder();
            expect(mockBot.sendMessage).not.toHaveBeenCalled();
            expect(memeService.getWaterReminder).not.toHaveBeenCalled();
        });

        it('should send water reminder', async () => {
            (metricsService.getTodaySum as jest.Mock).mockResolvedValue(500);
            (memeService.getWaterReminder as jest.Mock).mockResolvedValue({ message: 'Drink water!' });   
            await scheduler.sendWaterReminder();
            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                chatId,
                'Drink water!',
                expect.objectContaining({ reply_markup: expect.any(Object) })
            );
        });
    });

    describe('sendFoodReminder', () => {
        it('skips the reminder when the meal is already marked', async () => {
            (habitsService.getStatus as jest.Mock).mockResolvedValue({ almoco: true });
            await scheduler.sendFoodReminder('almoco');
            expect(mockBot.sendMessage).not.toHaveBeenCalled();
            expect(memeService.getFoodReminder).not.toHaveBeenCalled();
        });

        it('should send food reminder', async () => {
            (habitsService.getStatus as jest.Mock).mockResolvedValue({ almoco: false });
            (memeService.getFoodReminder as jest.Mock).mockResolvedValue({ message: 'Eat healthy!' });    
            await scheduler.sendFoodReminder('almoco');
            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                chatId,
                expect.stringContaining('Hora do almoço'),
                expect.objectContaining({ reply_markup: expect.any(Object) })
            );
        });
    });

    describe('sendHabitsCheckReminder', () => {
        it('should congratulate if all habits done', async () => {
            (habitsService.getUncompletedHabits as jest.Mock).mockResolvedValue([]);
            await scheduler.sendHabitsCheckReminder();
            expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, 'LLM Mika', undefined);
        });

        it('should send reminder if habits pending', async () => {
            (habitsService.getUncompletedHabits as jest.Mock).mockResolvedValue(['treino', 'leitura']);

            await scheduler.sendHabitsCheckReminder();

            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                chatId,
                'LLM Mika',
                expect.objectContaining({ reply_markup: expect.any(Object) })
            );
        });
    });

    describe('sendDailyReport', () => {
        it('should count official workout as completed treino habit', async () => {
            (habitsService.getStatus as jest.Mock).mockResolvedValue({
                treino: false,
                cardio: false,
                alongamento: false,
                leitura: false,
                meditacao: false,
                fio_dental: false,
                suplemento: false,
                cafe: false,
                almoco: false,
                cafe_tarde: false,
                jantar: false,
                sem_acucar: false,
            });
            (metricsService.getTodaySum as jest.Mock).mockResolvedValue(0);
            (workoutService.getStreak as jest.Mock).mockResolvedValue(1);
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: true });

            await scheduler.sendDailyReport();

            const report = (mockBot.sendMessage as jest.Mock).mock.calls[0][1];
            expect(report).toContain('✅ 💪 Treino');
            expect(report).toContain(`📊 <b>Hábitos:</b> 1/${HABITS.length}`);
            expect(report).toContain('💪 <b>Treino:</b> Feito ✅');
        });

        it('offers buttons only for what is still pending, and sends no GIF', async () => {
            (habitsService.getStatus as jest.Mock).mockResolvedValue({ cardio: true });
            (metricsService.getTodaySum as jest.Mock).mockResolvedValue(0);
            (workoutService.getStreak as jest.Mock).mockResolvedValue(0);
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });

            await scheduler.sendDailyReport();

            const opts = (mockBot.sendMessage as jest.Mock).mock.calls[0][2];
            expect(opts.reply_markup.inline_keyboard).toEqual([[expect.objectContaining({ callback_data: 'mark_trained' })]]);
            expect(sendGifMessage).not.toHaveBeenCalled();
        });

        it('sends the image dashboard with the same reconciled numbers as the text', async () => {
            (habitsService.getStatus as jest.Mock).mockResolvedValue({ treino: false, cardio: true });
            (metricsService.getTodaySum as jest.Mock).mockResolvedValue(1500);
            (workoutService.getStreak as jest.Mock).mockResolvedValue(3);
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: true });

            await scheduler.sendDailyReport();

            // Treino vem de workout_logs mesmo com daily_habits.treino=false: imagem não pode divergir do texto.
            expect(sendDailyDashboard).toHaveBeenCalledWith(mockBot, chatId, chatId, expect.objectContaining({
                trained: true, cardio: true, habitsCompleted: 2, habitsTotal: HABITS.length, water: 1500, streak: 3,
            }));
        });
    });

    describe('closeDay', () => {
        it('records a missed workout silently', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: false });
            await scheduler.closeDay();
            expect(workoutService.logWorkout).toHaveBeenCalledWith(chatId, false);
            expect(mockBot.sendMessage).not.toHaveBeenCalled();
        });

        it('does not touch a day that was trained', async () => {
            (workoutService.checkDailyMessages as jest.Mock).mockResolvedValue({ trained: true });
            await scheduler.closeDay();
            expect(workoutService.logWorkout).not.toHaveBeenCalled();
        });
    });

    describe('sendGoodMorning', () => {
        afterEach(() => { delete process.env.USER_ID; });

        it('sends one consolidated card: diet and escaped Mika line inside the menu message', async () => {
            const menuSpy = jest.spyOn(MenuController.prototype, 'sendGoodMorningMenu').mockResolvedValue();
            (memeService.getMorningReminder as jest.Mock).mockResolvedValue({ message: 'Bora <já>' });

            await scheduler.sendGoodMorning();

            const extra = menuSpy.mock.calls[0][2] as string;
            expect(extra).toContain('Cardápio de hoje');
            expect(extra).toContain('Bora &lt;já&gt;');
            expect(mockBot.sendMessage).not.toHaveBeenCalled();
            menuSpy.mockRestore();
        });

        it('should build the menu with USER_ID (data owner), delivering to CHAT_ID', async () => {
            process.env.USER_ID = '777';
            const menuSpy = jest.spyOn(MenuController.prototype, 'sendGoodMorningMenu').mockResolvedValue();
            (memeService.getMorningReminder as jest.Mock).mockResolvedValue({ message: 'Bom dia!' });

            await scheduler.sendGoodMorning();

            expect(menuSpy).toHaveBeenCalledWith(chatId, 777, expect.stringContaining('Cardápio de hoje'));
            menuSpy.mockRestore();
        });

        it('should fall back to CHAT_ID as user when USER_ID is absent', async () => {
            const menuSpy = jest.spyOn(MenuController.prototype, 'sendGoodMorningMenu').mockResolvedValue();
            (memeService.getMorningReminder as jest.Mock).mockResolvedValue({ message: 'Bom dia!' });

            await scheduler.sendGoodMorning();

            expect(menuSpy).toHaveBeenCalledWith(chatId, chatId, expect.any(String));
            menuSpy.mockRestore();
        });
    });
});

