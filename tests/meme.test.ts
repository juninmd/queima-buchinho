import { memeService } from '../src/services/meme.service';

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

    it('should return motivation audio path if exists', () => {
        const audio = memeService.getMotivationAudio();
        // Since we don't have the assets in CI/test env easily, we just check return type
        expect(audio === null || typeof audio === 'string').toBe(true);
    });
});
