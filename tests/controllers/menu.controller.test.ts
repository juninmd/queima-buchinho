import TelegramBot from 'node-telegram-bot-api';
import { MenuController } from '../../src/controllers/menu.controller';
import { habitsService } from '../../src/services/habits.service';
import { metricsService } from '../../src/services/metrics.service';
import { ollamaService } from '../../src/services/ollama.service';
import { myInstantsService } from '../../src/services/myinstants.service';
import { workoutService } from '../../src/services/workout.service';

jest.mock('../../src/services/habits.service');
jest.mock('../../src/services/metrics.service');
jest.mock('../../src/services/ollama.service');
jest.mock('../../src/services/mika.service', () => ({
  mikaService: { response: jest.fn().mockResolvedValue({ message: 'LLM Mika', audioSearchTerm: 'tone' }) }
}));
jest.mock('../../src/services/myinstants.service');
jest.mock('../../src/services/workout.service');

describe('MenuController', () => {
  let bot: jest.Mocked<TelegramBot>;
  let menuController: MenuController;

  beforeEach(() => {
    bot = {
      on: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({} as any),
      editMessageText: jest.fn().mockResolvedValue({} as any),
      sendChatAction: jest.fn().mockResolvedValue({} as any),
      sendAudio: jest.fn().mockResolvedValue({} as any),
    } as any;
    menuController = new MenuController(bot);
    jest.clearAllMocks();
  });

  describe('init', () => {
    it('should register listeners and handle commands', async () => {
      menuController.init();
      const messageHandler = (bot.on as jest.Mock).mock.calls.find(c => c[0] === 'message')[1];
      const channelPostHandler = (bot.on as jest.Mock).mock.calls.find(c => c[0] === 'channel_post')[1];

      (habitsService.getStatus as jest.Mock).mockResolvedValue({});
      (habitsService.getCompletedCount as jest.Mock).mockResolvedValue({ completed: 0, total: 5 });
      (metricsService.getTodaySum as jest.Mock).mockResolvedValue(0);
      (workoutService.getStreak as jest.Mock).mockResolvedValue(0);

      const msg = { text: '/menu', chat: { id: 123 }, from: { id: 456 } } as any;
      await messageHandler(msg);
      expect(bot.sendMessage).toHaveBeenCalled();

      // Help
      await messageHandler({ text: '/help', chat: { id: 123 } });
      expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('HÃ¡bitos'), expect.any(Object));

      // Agua
      await messageHandler({ text: '/agua', chat: { id: 123 }, from: { id: 456 } });
      expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Consumo de Ãgua'), expect.any(Object));

      // Semana
      (metricsService.getWeeklySummary as jest.Mock).mockResolvedValue({ current: { workouts: 0, metrics: { water: 0 } }, previous: { workouts: 0, metrics: { water: 0 } } });
      (ollamaService.getWeeklyReport as jest.Mock).mockResolvedValue({ message: 'Mandou bem!', audioSearchTerm: 'congrats' });
      await messageHandler({ text: '/semana', chat: { id: 123 }, from: { id: 456 } });
      expect(bot.sendMessage).toHaveBeenCalled();

      // Channel post
      await channelPostHandler({ text: '/help', chat: { id: 123 } });
      expect(bot.sendMessage).toHaveBeenCalled();

      // Bot username mention
      await messageHandler({ text: '/menu@mybot', chat: { id: 123 }, from: { id: 456 } });
      expect(bot.sendMessage).toHaveBeenCalled();
    });

    it('should handle error in handleCommand', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        menuController.init();
        const handler = (bot.on as jest.Mock).mock.calls.find(c => c[0] === 'message')[1];
        
        // Mock a failure in showMenu
        (habitsService.getStatus as jest.Mock).mockRejectedValue(new Error('Fail'));
        
        await handler({ text: '/menu', chat: { id: 123 }, from: { id: 456 } });
        
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('handleCommand'));
        consoleSpy.mockRestore();
    });
  });

  describe('showMenu', () => {
    it('should do nothing if no userId', async () => {
        await menuController.showMenu({ chat: { id: 123 } } as any);
        expect(bot.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('refreshMenu', () => {
    it('should refresh and handle unchanged message error', async () => {
        (habitsService.getStatus as jest.Mock).mockResolvedValue({});
        (habitsService.getCompletedCount as jest.Mock).mockResolvedValue({ completed: 1, total: 5 });
        (metricsService.getTodaySum as jest.Mock).mockResolvedValue(250);
        bot.editMessageText.mockRejectedValue(new Error('message is not modified'));

        await menuController.refreshMenu(123, 456, 789);
        expect(bot.editMessageText).toHaveBeenCalled();
    });
  });

  describe('showWeekly', () => {
      it('should return if no userId', async () => {
          await menuController.showWeekly({ chat: { id: 123 } } as any);
          expect(bot.sendChatAction).not.toHaveBeenCalled();
      });

      it('should handle missing summary', async () => {
          (metricsService.getWeeklySummary as jest.Mock).mockResolvedValue(null);
          await menuController.showWeekly({ chat: { id: 123 }, from: { id: 456 } } as any);
          expect(bot.sendMessage).toHaveBeenCalledWith(123, 'âŒ Erro ao gerar resumo semanal.');
      });

      it('should handle missing LLM response', async () => {
        (metricsService.getWeeklySummary as jest.Mock).mockResolvedValue({ current: { workouts: 0, metrics: { water: 0 } }, previous: { workouts: 0, metrics: { water: 0 } } });
        (ollamaService.getWeeklyReport as jest.Mock).mockResolvedValue(null);
        await menuController.showWeekly({ chat: { id: 123 }, from: { id: 456 } } as any);
        expect(bot.sendMessage).toHaveBeenCalledWith(123, 'âŒ Erro ao processar resumo semanal.');
    });

    it('should handle generic error', async () => {
        (metricsService.getWeeklySummary as jest.Mock).mockRejectedValue(new Error('Generic'));
        await menuController.showWeekly({ chat: { id: 123 }, from: { id: 456 } } as any);
        expect(bot.sendMessage).toHaveBeenCalledWith(123, 'âŒ Erro ao processar resumo semanal.');
    });

    it('should handle audio if provided', async () => {
        (metricsService.getWeeklySummary as jest.Mock).mockResolvedValue({ 
            current: { workouts: 1, metrics: { water: 100 } }, 
            previous: { workouts: 0, metrics: { water: 50 } } 
        });
        (ollamaService.getWeeklyReport as jest.Mock).mockResolvedValue({ message: 'Ok', audioSearchTerm: 'ok' });
        (myInstantsService.getBestMatchAudio as jest.Mock).mockResolvedValue({ audioUrl: 'url', title: 'title' });
        
        await menuController.showWeekly({ chat: { id: 123 }, from: { id: 456 } } as any);
        expect(bot.sendAudio).toHaveBeenCalled();
    });
  });
});

