import { ttsService } from '../../src/services/tts.service';
import { exec } from 'child_process';
import fs from 'fs';

jest.mock('child_process', () => ({
    exec: jest.fn((cmd, cb) => cb(null, { stdout: '', stderr: '' }))
}));

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    mkdirSync: jest.fn(),
    existsSync: jest.fn(),
    unlinkSync: jest.fn()
}));

describe('TtsService', () => {
    const mockExec = exec as unknown as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateMikaAudio', () => {
        it('should call edge-tts command with correct parameters', async () => {
            const text = 'Olá, eu sou a Mika!';
            const path = await ttsService.generateMikaAudio(text);

            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining(`edge-tts --text "Olá, eu sou a Mika!" --voice "pt-BR-FranciscaNeural"`),
                expect.any(Function)
            );
            expect(path).toContain('mika_audio');
            expect(path).toContain('.mp3');
        });


        it('should throw error if exec fails', async () => {
            mockExec.mockImplementationOnce((cmd, cb) => cb(new Error('Exec failed')));
            
            await expect(ttsService.generateMikaAudio('test'))
                .rejects.toThrow('Erro ao gerar áudio da Mika: Exec failed');
        });
    });

    describe('cleanup', () => {
        it('should delete file if it exists', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            
            await ttsService.cleanup('/tmp/test.mp3');
            
            expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test.mp3');
        });
    });
});
