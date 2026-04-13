import TelegramBot from 'node-telegram-bot-api';
import { MenuController } from '../../src/controllers/menu.controller';
import { habitsService } from '../../src/services/habits.service';
import { metricsService } from '../../src/services/metrics.service';
import { ollamaService } from '../../src/services/ollama.service';
import { myInstantsService } from '../../src/services/myinstants.service';

jest.mock('../../src/services/habits.service');
jest.mock('../../src/services/metrics.service');
jest.mock('../../src/services/ollama.service');
jest.mock('../../src/services/myinstants.service');

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

      // We need to wait for the async execution within the handler
      const msg = { text: '/menu', chat: { id: 123 }, from: { id: 456 } } as any;
      messageHandler(msg);
      await new Promise(r => setTimeout(r, 10));
      expect(bot.sendMessage).toHaveBeenCalled();

      // Help
      messageHandler({ text: '/help', chat: { id: 123 } });
      await new Promise(r => setTimeout(r, 10));
      expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Hábitos'), expect.any(Object));

      // Agua
      messageHandler({ text: '/agua', chat: { id: 123 }, from: { id: 456 } });
      await new Promise(r => setTimeout(r, 10));
      expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Consumo de Água'), expect.any(Object));

      // Semana
      (metricsService.getWeeklySummary as jest.Mock).mockResolvedValue({ current: { workouts: 0, metrics: { water: 0 } }, previous: { workouts: 0, metrics: { water: 0 } } });
      (ollamaService.getWeeklyReport as jest.Mock).mockResolvedValue({ message: 'Mandou bem!', audioSearchTerm: 'congrats' });
      messageHandler({ text: '/semana', chat: { id: 123 }, from: { id: 456 } });
      await new Promise(r => setTimeout(r, 10));
      expect(bot.sendMessage).toHaveBeenCalled();

      // Channel post
      channelPostHandler({ text: '/help', chat: { id: 123 } });
      await new Promise(r => setTimeout(r, 10));
      expect(bot.sendMessage).toHaveBeenCalled();

      // Bot username mention
      messageHandler({ text: '/menu@mybot', chat: { id: 123 }, from: { id: 456 } });
      await new Promise(r => setTimeout(r, 10));
      expect(bot.sendMessage).toHaveBeenCalled();
    });

    it('should handle error in handleCommand', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        menuController.init();
        const handler = (bot.on as jest.Mock).mock.calls.find(c => c[0] === 'message')[1];
        
        // Mock a failure in showMenu
        (habitsService.getStatus as jest.Mock).mockRejectedValue(new Error('Fail'));
        
        handler({ text: '/menu', chat: { id: 123 }, from: { id: 456 } });
        await new Promise(r => setTimeout(r, 10));
        
        expect(consoleSpy).toHaveBeenCalledWith('[MenuController] Erro no handleCommand:', expect.any(Error));
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
          expect(bot.sendMessage).toHaveBeenCalledWith(123, '❌ Erro ao gerar resumo semanal.');
      });

      it('should handle missing ollama response', async () => {
        (metricsService.getWeeklySummary as jest.Mock).mockResolvedValue({ current: { workouts: 0, metrics: { water: 0 } }, previous: { workouts: 0, metrics: { water: 0 } } });
        (ollamaService.getWeeklyReport as jest.Mock).mockResolvedValue(null);
        await menuController.showWeekly({ chat: { id: 123 }, from: { id: 456 } } as any);
        expect(bot.sendMessage).toHaveBeenCalledWith(123, '❌ Não consegui gerar o relatório. Tenta de novo mais tarde!');
    });

    it('should handle generic error', async () => {
        (metricsService.getWeeklySummary as jest.Mock).mockRejectedValue(new Error('Generic'));
        await menuController.showWeekly({ chat: { id: 123 }, from: { id: 456 } } as any);
        expect(bot.sendMessage).toHaveBeenCalledWith(123, '❌ Erro ao processar resumo semanal.');
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
