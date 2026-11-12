import { ttsService } from '../../src/services/tts.service';
import { EdgeTTS } from 'edge-tts-universal';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';

jest.mock('edge-tts-universal');
jest.mock('child_process', () => ({ spawn: jest.fn() }));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    mkdirSync: jest.fn(),
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
    writeFileSync: jest.fn()
}));

describe('TtsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateMikaAudio', () => {
        it('should call EdgeTTS with correct parameters', async () => {
            const mockSynthesize = jest.fn().mockResolvedValue({
                audio: {
                    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
                }
            });
            (EdgeTTS as jest.Mock).mockImplementation(() => ({
                synthesize: mockSynthesize
            }));

            const text = 'Olá, eu sou a Mika!';
            const path = await ttsService.generateMikaAudio(text);

            expect(EdgeTTS).toHaveBeenCalledWith(
                expect.stringContaining('Olá, eu sou a Mika!'),
                'pt-BR-FranciscaNeural'
            );
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(path).toContain('mika_audio');
            expect(path).toContain('.mp3');
        });

        it('should throw error if synthesis fails', async () => {
            (EdgeTTS as jest.Mock).mockImplementation(() => ({
                synthesize: jest.fn().mockRejectedValue(new Error('Synthesis failed'))
            }));

            await expect(ttsService.generateMikaAudio('test'))
                .rejects.toThrow('Erro ao gerar áudio da Mika: Synthesis failed');
        });

        it('cai para o CLI edge-tts quando a lib falha', async () => {
            (EdgeTTS as jest.Mock).mockImplementation(() => ({
                synthesize: jest.fn().mockRejectedValue(new Error('lib travou'))
            }));
            const child: any = new EventEmitter();
            child.stderr = new EventEmitter();
            child.kill = jest.fn();
            (spawn as jest.Mock).mockReturnValue(child);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const pending = ttsService.generateMikaAudio('teste do fallback');
            setTimeout(() => child.emit('close', 0), 0);

            await expect(pending).resolves.toContain('.mp3');
            expect(spawn).toHaveBeenCalledWith(
                'edge-tts',
                expect.arrayContaining(['--write-media']),
                expect.anything()
            );
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
