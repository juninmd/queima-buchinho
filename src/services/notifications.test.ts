import { NotificationService } from './notifications';
import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
}));

const mockAccess = fs.access as jest.Mock;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockBot: TelegramBot;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      sendVoice: jest.fn().mockResolvedValue({}),
      sendPhoto: jest.fn().mockResolvedValue({}),
    } as unknown as TelegramBot;

    notificationService = new NotificationService(mockBot);
  });

  it('should send motivation audio if exists', async () => {
    // Both audio and photo exist
    mockAccess.mockResolvedValue(undefined);

    await notificationService.sendMotivation(123, 456);

    expect(mockBot.sendVoice).toHaveBeenCalled();
    // sendMessage is only called if audio fails
    expect(mockBot.sendMessage).not.toHaveBeenCalled();
    expect(mockBot.sendPhoto).toHaveBeenCalled();
  });

  it('should send motivation text if audio does not exist', async () => {
    // Both audio and photo do NOT exist
    mockAccess.mockRejectedValue(new Error('File not found'));

    await notificationService.sendMotivation(123, 456);

    expect(mockBot.sendVoice).not.toHaveBeenCalled();
    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      expect.any(Number),
      expect.stringContaining('Lembre-se: o treino de hoje é a força de amanhã!'),
      // The third argument (options) is optional in TelegramBot but might be passed as undefined or object
      // Our code doesn't pass options for sendMessage fallback.
    );
    expect(mockBot.sendPhoto).not.toHaveBeenCalled();
  });

  it('should send congratulations', async () => {
    await notificationService.sendCongratulations(123, 456);
    expect(mockBot.sendMessage).toHaveBeenCalled();
  });
});
