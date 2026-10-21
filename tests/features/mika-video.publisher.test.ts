import { isMikaVideoEnabled, sendMikaVideo } from '../../src/features/mika-video/mika-video.publisher';
import { renderMikaVideo } from '../../src/features/mika-video/render';

jest.mock('../../src/features/mika-video/render', () => ({
    renderMikaVideo: jest.fn(),
    chromiumPath: jest.fn(() => '/usr/bin/chromium'),
    DEFAULT_VRM: __filename,
}));

const makeBot = () => ({
    sendChatAction: jest.fn().mockResolvedValue(true),
    sendVideoNote: jest.fn().mockResolvedValue({}),
    sendVideo: jest.fn().mockResolvedValue({}),
}) as any;

describe('mika-video publisher', () => {
    beforeEach(() => { jest.clearAllMocks(); delete process.env.MIKA_VIDEO; });

    it('envia vídeo redondo quando cabe em 60 s', async () => {
        (renderMikaVideo as jest.Mock).mockResolvedValue({ path: 'x.mp4', seconds: 20 });
        const bot = makeBot();
        await expect(sendMikaVideo(bot, 1, 'fala.mp3')).resolves.toBe(true);
        expect(bot.sendVideoNote).toHaveBeenCalledWith(1, expect.stringContaining('mika_video_'), { length: 640 });
        expect(bot.sendVideo).not.toHaveBeenCalled();
    });

    it('usa vídeo comum quando passa de 60 s', async () => {
        (renderMikaVideo as jest.Mock).mockResolvedValue({ path: 'x.mp4', seconds: 75 });
        const bot = makeBot();
        await expect(sendMikaVideo(bot, 1, 'fala.mp3')).resolves.toBe(true);
        expect(bot.sendVideo).toHaveBeenCalled();
        expect(bot.sendVideoNote).not.toHaveBeenCalled();
    });

    it('devolve false (sem lançar) quando o render falha', async () => {
        (renderMikaVideo as jest.Mock).mockRejectedValue(new Error('chromium caiu'));
        const bot = makeBot();
        await expect(sendMikaVideo(bot, 1, 'fala.mp3')).resolves.toBe(false);
        expect(bot.sendVideoNote).not.toHaveBeenCalled();
    });

    it('faz um render por vez', async () => {
        let running = 0, peak = 0;
        (renderMikaVideo as jest.Mock).mockImplementation(async () => {
            peak = Math.max(peak, ++running);
            await new Promise(r => setTimeout(r, 20));
            running--;
            return { path: 'x.mp4', seconds: 5 };
        });
        const bot = makeBot();
        await Promise.all([sendMikaVideo(bot, 1, 'a.mp3'), sendMikaVideo(bot, 1, 'b.mp3')]);
        expect(peak).toBe(1);
    });

    it('MIKA_VIDEO=0 desliga e o padrão liga quando há modelo e Chromium', () => {
        expect(isMikaVideoEnabled()).toBe(true);
        process.env.MIKA_VIDEO = '0';
        expect(isMikaVideoEnabled()).toBe(false);
    });
});
