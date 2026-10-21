import { buildLipSyncTrack, SAMPLE_RATE } from '../../src/features/mika-video/lip-sync-track';

const tone = (hz: number, seconds: number, amp: number) =>
    Float32Array.from({ length: Math.round(seconds * SAMPLE_RATE) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE));

describe('mika-video lip-sync track', () => {
    it('gera um quadro por frame de vídeo, com a boca fechada no silêncio', () => {
        const track = buildLipSyncTrack(new Float32Array(SAMPLE_RATE), 30, 30);
        expect(track).toHaveLength(30);
        expect(Math.max(...track.map(f => f.open))).toBe(0);
    });

    it('abre a boca com fala e fecha de novo quando o áudio acaba', () => {
        const pcm = new Float32Array(SAMPLE_RATE * 2);
        pcm.set(tone(700, 1, 0.4));
        const track = buildLipSyncTrack(pcm, 30, 60);
        expect(track[15].open).toBeGreaterThan(0.5);
        expect(track[55].open).toBe(0);
    });

    it('formantes de "i" (300 Hz + 2400 Hz) dão peso máximo à vogal i', () => {
        const low = tone(300, 1, 0.3), high = tone(2400, 1, 0.3);
        const pcm = low.map((v, k) => v + high[k]);
        const { vowels } = buildLipSyncTrack(pcm, 30, 30)[20];
        const best = Object.entries(vowels).sort((a, b) => b[1] - a[1])[0][0];
        expect(best).toBe('i');
    });
});
