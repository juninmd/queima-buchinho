import TelegramBot from 'node-telegram-bot-api';
import { sendAudioMessage } from '../../src/utils/telegram';

describe('Telegram Utils', () => {
    let mockBot: jest.Mocked<TelegramBot>;
    const chatId = 123456;
    const caption = 'Test caption';

    beforeEach(() => {
        mockBot = {
            sendVoice: jest.fn(),
            sendMessage: jest.fn(), sendChatAction: jest.fn(),
        } as unknown as jest.Mocked<TelegramBot>;
    });

    it('should send voice message when audioPath is provided', async () => {
        const audioPath = 'path/to/audio.mp3';
        await sendAudioMessage(mockBot, chatId, audioPath, caption);

        expect(mockBot.sendVoice).toHaveBeenCalledWith(chatId, audioPath, { caption });
        expect(mockBot.sendMessage).not.toHaveBeenCalled();
    });

    it('should send text message when audioPath is null', async () => {
        await sendAudioMessage(mockBot, chatId, null, caption);

        expect(mockBot.sendVoice).not.toHaveBeenCalled();
        expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, caption, undefined);
    });

    it('should fallback to text message if sendVoice fails', async () => {
        const audioPath = 'invalid/path.mp3';
        mockBot.sendVoice.mockRejectedValueOnce(new Error('Failed to send voice'));
        
        // Mock console.error to avoid cluttering test output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await sendAudioMessage(mockBot, chatId, audioPath, caption);

        expect(mockBot.sendVoice).toHaveBeenCalledWith(chatId, audioPath, { caption });
        expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, caption, undefined);
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });
});
