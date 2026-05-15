import TelegramBot from 'node-telegram-bot-api';
import { sendAudioMessage, sendPhotoMessage, sendStickerMessage, sendGifMessage } from '../../src/utils/telegram';

describe('Telegram Utils', () => {
    let mockBot: jest.Mocked<TelegramBot>;
    const chatId = 123456;
    const caption = 'Test caption';

    beforeEach(() => {
        mockBot = {
            sendVoice: jest.fn(),
            sendMessage: jest.fn(),
            sendChatAction: jest.fn(),
            sendPhoto: jest.fn(),
            sendSticker: jest.fn(),
            sendAnimation: jest.fn(),
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

describe('sendPhotoMessage', () => {
    let mockBot: jest.Mocked<TelegramBot>;
    const chatId = 123;

    beforeEach(() => {
        mockBot = {
            sendVoice: jest.fn(),
            sendMessage: jest.fn().mockResolvedValue({}),
            sendChatAction: jest.fn().mockResolvedValue({}),
            sendPhoto: jest.fn().mockResolvedValue({}),
            sendSticker: jest.fn().mockResolvedValue({}),
            sendAnimation: jest.fn().mockResolvedValue({}),
        } as unknown as jest.Mocked<TelegramBot>;
    });

    it('should send photo via URL', async () => {
        await sendPhotoMessage(mockBot, chatId, 'http://example.com/img.jpg', 'cap');
        expect(mockBot.sendPhoto).toHaveBeenCalledWith(chatId, 'http://example.com/img.jpg', expect.objectContaining({ caption: 'cap' }));
    });

    it('should send text if no photo and caption present', async () => {
        await sendPhotoMessage(mockBot, chatId, null, 'fallback');
        expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, 'fallback', undefined);
    });

    it('should do nothing if no photo and no caption', async () => {
        await sendPhotoMessage(mockBot, chatId, null);
        expect(mockBot.sendMessage).not.toHaveBeenCalled();
        expect(mockBot.sendPhoto).not.toHaveBeenCalled();
    });

    it('should fallback to sendMessage if sendPhoto fails', async () => {
        mockBot.sendPhoto.mockRejectedValueOnce(new Error('fail'));
        const spy = jest.spyOn(console, 'error').mockImplementation();
        await sendPhotoMessage(mockBot, chatId, 'http://x.com/img.jpg', 'cap');
        expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, 'cap', undefined);
        spy.mockRestore();
    });
});

describe('sendStickerMessage', () => {
    let mockBot: jest.Mocked<TelegramBot>;
    const chatId = 123;

    beforeEach(() => {
        mockBot = {
            sendMessage: jest.fn().mockResolvedValue({}),
            sendChatAction: jest.fn().mockResolvedValue({}),
            sendSticker: jest.fn().mockResolvedValue({}),
        } as unknown as jest.Mocked<TelegramBot>;
    });

    it('should do nothing if no sticker', async () => {
        await sendStickerMessage(mockBot, chatId, null);
        expect(mockBot.sendSticker).not.toHaveBeenCalled();
    });

    it('should send sticker from URL', async () => {
        await sendStickerMessage(mockBot, chatId, 'http://example.com/sticker.webp');
        expect(mockBot.sendSticker).toHaveBeenCalledWith(chatId, 'http://example.com/sticker.webp', undefined);
    });

    it('should log error if sendSticker fails', async () => {
        mockBot.sendSticker.mockRejectedValueOnce(new Error('fail'));
        const spy = jest.spyOn(console, 'error').mockImplementation();
        await sendStickerMessage(mockBot, chatId, 'http://x.com/s.webp');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});

describe('sendGifMessage', () => {
    let mockBot: jest.Mocked<TelegramBot>;
    const chatId = 123;

    beforeEach(() => {
        mockBot = {
            sendMessage: jest.fn().mockResolvedValue({}),
            sendChatAction: jest.fn().mockResolvedValue({}),
            sendSticker: jest.fn().mockResolvedValue({}),
            sendAnimation: jest.fn().mockResolvedValue({}),
        } as unknown as jest.Mocked<TelegramBot>;
    });

    it('should do nothing if no gifUrl', async () => {
        await sendGifMessage(mockBot, chatId, null);
        expect(mockBot.sendAnimation).not.toHaveBeenCalled();
    });

    it('should send animation for non-giphy URL', async () => {
        await sendGifMessage(mockBot, chatId, 'http://example.com/anim.gif', 'cap');
        expect(mockBot.sendAnimation).toHaveBeenCalledWith(chatId, 'http://example.com/anim.gif', expect.objectContaining({ caption: 'cap' }));
    });

    it('should attempt sendSticker for giphy URL', async () => {
        await sendGifMessage(mockBot, chatId, 'https://media.giphy.com/media/abc/giphy.gif', 'cap');
        expect(mockBot.sendSticker).toHaveBeenCalled();
    });

    it('should fallback to sendMessage if all send methods fail', async () => {
        mockBot.sendAnimation.mockRejectedValueOnce(new Error('fail'));
        const spy = jest.spyOn(console, 'error').mockImplementation();
        await sendGifMessage(mockBot, chatId, 'http://example.com/anim.gif', 'cap');
        spy.mockRestore();
    });
});
