import * as fs from 'fs';
import { memeService } from '../../src/services/meme.service';
import { ollamaService } from '../../src/services/ollama.service';

jest.mock('fs');
jest.mock('../../src/services/ollama.service');

describe('MemeService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each([
        ['getRoastMessage', () => memeService.getRoastMessage()],
        ['getCongratsMessage', () => memeService.getCongratsMessage()],
        ['getMorningReminder', () => memeService.getMorningReminder('Segunda')],
        ['getConditionalReminder', () => memeService.getConditionalReminder('10:00')],
        ['getWaterReminder', () => memeService.getWaterReminder()],
        ['getFoodReminder', () => memeService.getFoodReminder('cafe')]
    ])('%s should return LLM response', async (_name, call) => {
        (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue({ message: 'Dynamic', audioSearchTerm: 'audio' });
        await expect(call()).resolves.toEqual({ message: 'Dynamic', audioSearchTerm: 'audio' });
    });

    it('should throw if LLM response is unavailable', async () => {
        (ollamaService.generateDynamicResponse as jest.Mock).mockResolvedValue(null);
        await expect(memeService.getRoastMessage()).rejects.toThrow('Mika LLM response unavailable');
    });

    describe('getRoastAudio', () => {
        it('should return audio path if file exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            expect(memeService.getRoastAudio()).toContain('.mp3');
        });

        it('should return null if file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            expect(memeService.getRoastAudio()).toBeNull();
        });
    });

    describe('getMotivationAudio', () => {
        it('should return audio path if file exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            expect(memeService.getMotivationAudio()).toContain('tai-lung');
        });

        it('should return null if file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            expect(memeService.getMotivationAudio()).toBeNull();
        });
    });
});
