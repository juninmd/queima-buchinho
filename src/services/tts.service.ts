import { EdgeTTS } from 'edge-tts-universal';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { logger } from '../utils/logger';

/** Tempo máximo da lib (ela trava sem aviso em produção). */
const LIB_TIMEOUT_MS = Number(process.env.TTS_TIMEOUT_MS) || 20_000;
/** Tempo máximo do CLI `edge-tts` (fallback, instalado na imagem Docker). */
const CLI_TIMEOUT_MS = Number(process.env.TTS_CLI_TIMEOUT_MS) || 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} travou por ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => { if (timer) clearTimeout(timer); }) as Promise<T>;
}

export class TtsService {
    private readonly voice = 'pt-BR-FranciscaNeural';
    private readonly tmpDir = path.join(os.tmpdir(), 'mika_audio');
    private readonly cliBin = process.env.EDGE_TTS_CLI || 'edge-tts';

    constructor() {
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync(this.tmpDir, { recursive: true });
        }
    }

    /**
     * Gera o mp3 da Mika. A lib `edge-tts-universal` trava (sem erro e sem timeout)
     * em algumas redes; por isso roda com deadline e cai para o CLI `edge-tts`,
     * que a imagem Docker instala. Só falha se os dois caminhos falharem.
     */
    public async generateMikaAudio(text: string): Promise<string> {
        const outputPath = path.join(this.tmpDir, `mika_${Date.now()}.mp3`);
        const sanitizedText = text.replace(/"/g, "'").replace(/\n/g, ' ');

        logger.info(`🎙️ [TTS] Gerando áudio para: "${sanitizedText.substring(0, 50)}..."`);

        try {
            await withTimeout(this.synthesizeLib(sanitizedText, outputPath), LIB_TIMEOUT_MS, 'edge-tts-universal');
        } catch (error: any) {
            logger.warn(`⚠️ [TTS] edge-tts-universal falhou (${error?.message || error}). Tentando o CLI edge-tts...`);
            try {
                await this.synthesizeCli(sanitizedText, outputPath);
            } catch (fallbackError: any) {
                logger.error('❌ [TTS] CLI edge-tts também falhou:', fallbackError?.message || fallbackError);
                throw new Error(`Erro ao gerar áudio da Mika: ${error?.message || error}`);
            }
        }

        logger.info(`✅ [TTS] Áudio gerado em: ${outputPath}`);
        return outputPath;
    }

    private async synthesizeLib(text: string, outputPath: string): Promise<void> {
        const tts = new EdgeTTS(text, this.voice);
        const result = await tts.synthesize();
        const arrayBuffer = await result.audio.arrayBuffer();
        fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    }

    private synthesizeCli(text: string, outputPath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const child = spawn(this.cliBin, ['--voice', this.voice, '--text', text, '--write-media', outputPath], {
                stdio: ['ignore', 'ignore', 'pipe']
            });
            let stderr = '';
            let settled = false;
            const finish = (fn: () => void) => { if (!settled) { settled = true; clearTimeout(timer); fn(); } };
            const timer = setTimeout(() => {
                child.kill('SIGKILL');
                finish(() => reject(new Error(`edge-tts CLI travou por ${CLI_TIMEOUT_MS}ms`)));
            }, CLI_TIMEOUT_MS);
            child.stderr?.on('data', (data) => { stderr += data.toString(); });
            child.on('error', (err) => finish(() => reject(err)));
            child.on('close', (code) => finish(() => {
                if (code !== 0) return reject(new Error(`edge-tts CLI saiu com ${code}: ${stderr.slice(-200)}`));
                if (!fs.existsSync(outputPath)) return reject(new Error('edge-tts CLI não gerou o arquivo'));
                resolve();
            }));
        });
    }

    /**
     * Remove o arquivo temporário após o envio
     */
    public async cleanup(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            logger.error('❌ [TTS] Erro ao limpar áudio temporário:', error);
        }
    }
}

export const ttsService = new TtsService();
