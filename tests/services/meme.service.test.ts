import * as path from 'path';
import * as fs from 'fs';
import { memeService } from '../../src/services/meme.service';
import { ollamaService } from '../../src/services/ollama.service';

jest.mock('fs');
jest.mock('../../src/services/ollama.service');

describe('MemeService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getRoastMessage', () => {
        it('should return dynamic response if available', async () => {
            (ollamaService.getDynamicRoast as jest.Mock).mockResolvedValue({ message: 'Dynamic Roast', audioSearchTerm: 'sad' });
            const result = await memeService.getRoastMessage();
            expect(result.message).toBe('Dynamic Roast');
        });

        it('should return static response if dynamic fails', async () => {
            (ollamaService.getDynamicRoast as jest.Mock).mockResolvedValue(null);
            const result = await memeService.getRoastMessage();
            expect(result.message).toBeDefined();
            expect(result.audioSearchTerm).toBe('sad trombone');
        });
    });

    describe('getCongratsMessage', () => {
        it('should return dynamic response if available', async () => {
            (ollamaService.getDynamicCongrats as jest.Mock).mockResolvedValue({ message: 'Dynamic Congrats', audioSearchTerm: 'applause' });
            const result = await memeService.getCongratsMessage();
            expect(result.message).toBe('Dynamic Congrats');
        });

        it('should return static response if dynamic fails', async () => {
            (ollamaService.getDynamicCongrats as jest.Mock).mockResolvedValue(null);
            const result = await memeService.getCongratsMessage();
            expect(result.message).toBeDefined();
            expect(result.audioSearchTerm).toBe('congratulations');
        });
    });

    describe('getMorningReminder', () => {
        it('should return dynamic response if available', async () => {
            (ollamaService.getMorningReminder as jest.Mock).mockResolvedValue({ message: 'Dynamic Morning' });
            const result = await memeService.getMorningReminder('Segunda');
            expect(result.message).toBe('Dynamic Morning');
        });

        it('should return static response if dynamic fails', async () => {
            (ollamaService.getMorningReminder as jest.Mock).mockResolvedValue(null);
            const result = await memeService.getMorningReminder('Segunda');
            expect(result.message).toContain('Segunda');
        });
    });

    describe('getConditionalReminder', () => {
        it('should return dynamic response if available', async () => {
            (ollamaService.getConditionalReminder as jest.Mock).mockResolvedValue({ message: 'Dynamic Conditional' });
            const result = await memeService.getConditionalReminder('10:00');
            expect(result.message).toBe('Dynamic Conditional');
        });

        it('should return static response if dynamic fails', async () => {
            (ollamaService.getConditionalReminder as jest.Mock).mockResolvedValue(null);
            const result = await memeService.getConditionalReminder('10:00');
            expect(result.message).toContain('10:00');
        });
    });

    describe('getWaterReminder', () => {
        it('should return dynamic response if available', async () => {
            (ollamaService.getWaterReminder as jest.Mock).mockResolvedValue({ message: 'Dynamic Water' });
            const result = await memeService.getWaterReminder();
            expect(result.message).toBe('Dynamic Water');
        });

        it('should return static response if dynamic fails', async () => {
            (ollamaService.getWaterReminder as jest.Mock).mockResolvedValue(null);
            const result = await memeService.getWaterReminder();
            expect(result.message).toBeDefined();
        });
    });

    describe('getFoodReminder', () => {
        it('should return dynamic response if available', async () => {
            (ollamaService.getFoodReminder as jest.Mock).mockResolvedValue({ message: 'Dynamic Food' });
            const result = await memeService.getFoodReminder('cafe');
            expect(result.message).toBe('Dynamic Food');
        });

        it('should return static response if dynamic fails for all meals', async () => {
            (ollamaService.getFoodReminder as jest.Mock).mockResolvedValue(null);
            
            expect((await memeService.getFoodReminder('cafe')).message).toBeDefined();
            expect((await memeService.getFoodReminder('almoco')).message).toBeDefined();
            expect((await memeService.getFoodReminder('jantar')).message).toBeDefined();
        });
    });

    describe('getRoastAudio', () => {
        it('should return audio path if file exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            const result = memeService.getRoastAudio();
            expect(result).toContain('.mp3');
        });

        it('should return null if file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const result = memeService.getRoastAudio();
            expect(result).toBeNull();
        });
    });

    describe('getMotivationAudio', () => {
        it('should return audio path if file exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            const result = memeService.getMotivationAudio();
            expect(result).toContain('tai-lung');
        });

        it('should return null if file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const result = memeService.getMotivationAudio();
            expect(result).toBeNull();
        });
    });
});
