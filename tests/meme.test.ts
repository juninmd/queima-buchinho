import { memeService } from '../src/services/meme.service';
import { ollamaService } from '../src/services/ollama.service';

jest.mock('../src/services/ollama.service', () => ({
    ollamaService: {
        generateDynamicResponse: jest.fn().mockResolvedValue({ message: 'mock mika', audioSearchTerm: 'mock audio' })
    }
}));

describe('MemeService', () => {
    it.each([
        ['roast', () => memeService.getRoastMessage()],
        ['congrats', () => memeService.getCongratsMessage()],
        ['morning', () => memeService.getMorningReminder('Segunda')],
        ['conditional', () => memeService.getConditionalReminder('12:00')]
    ])('should return an LLM %s message', async (_name, call) => {
        const res = await call();
        expect(res.message).toBe('mock mika');
    });

    it('should throw when LLM fails', async () => {
        (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue(null);
        await expect(memeService.getRoastMessage()).rejects.toThrow('Mika LLM response unavailable');
    });

    it('should return motivation audio path if exists', () => {
        const audio = memeService.getMotivationAudio();
        expect(audio === null || typeof audio === 'string').toBe(true);
    });
});
