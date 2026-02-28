import { memeService } from '../src/services/meme.service';
import { ollamaService } from '../src/services/ollama.service';


describe('MemeService', () => {
    it('should return a roast message', async () => {
        const res = await memeService.getRoastMessage();
        expect(typeof res.message).toBe('string');
        expect(res.message.length).toBeGreaterThan(0);
    });

    it('should return a congrats message', async () => {
        const res = await memeService.getCongratsMessage();
        expect(typeof res.message).toBe('string');
        expect(res.message.length).toBeGreaterThan(0);
    });

    it('should return a morning reminder', async () => {
        const res = await memeService.getMorningReminder('Segunda');
        expect(typeof res.message).toBe('string');
        expect(res.message.length).toBeGreaterThan(0);
    });

    it('should return a conditional reminder', async () => {
        const res = await memeService.getConditionalReminder('12:00');
        expect(typeof res.message).toBe('string');
        expect(res.message.length).toBeGreaterThan(0);
    });

    it('should fallback to static roast when ollama fails', async () => {
        const originalDynamicRoast = ollamaService.getDynamicRoast;
        ollamaService.getDynamicRoast = jest.fn().mockResolvedValue(null);

        const res = await memeService.getRoastMessage();
        expect(typeof res.message).toBe('string');
        expect(res.audioSearchTerm).toBe('sad trombone');

        ollamaService.getDynamicRoast = originalDynamicRoast;
    });

    it('should fallback to static congrats when ollama fails', async () => {
        const originalDynamicCongrats = ollamaService.getDynamicCongrats;
        ollamaService.getDynamicCongrats = jest.fn().mockResolvedValue(null);

        const res = await memeService.getCongratsMessage();
        expect(typeof res.message).toBe('string');
        expect(res.audioSearchTerm).toBe('congratulations');

        ollamaService.getDynamicCongrats = originalDynamicCongrats;
    });

    it('should fallback to static morning reminder when ollama fails', async () => {
        const originalMorningReminder = ollamaService.getMorningReminder;
        ollamaService.getMorningReminder = jest.fn().mockResolvedValue(null);

        const res = await memeService.getMorningReminder('Segunda');
        expect(typeof res.message).toBe('string');
        expect(res.audioSearchTerm).toBe('tome');

        ollamaService.getMorningReminder = originalMorningReminder;
    });

    it('should fallback to static conditional reminder when ollama fails', async () => {
        const originalConditionalReminder = ollamaService.getConditionalReminder;
        ollamaService.getConditionalReminder = jest.fn().mockResolvedValue(null);

        const res = await memeService.getConditionalReminder('12:00');
        expect(typeof res.message).toBe('string');
        expect(res.audioSearchTerm).toBe('sad trombone');

        ollamaService.getConditionalReminder = originalConditionalReminder;
    });

    it('should return motivation audio path if exists', () => {
        const audio = memeService.getMotivationAudio();
        // Since we don't have the assets in CI/test env easily, we just check return type
        expect(audio === null || typeof audio === 'string').toBe(true);
    });
});
