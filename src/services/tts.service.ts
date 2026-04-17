import { EdgeTTS } from 'edge-tts-universal';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export class TtsService {
    private readonly voice = 'pt-BR-FranciscaNeural';
    private readonly tmpDir = '/tmp/mika_audio';

    constructor() {
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync(this.tmpDir, { recursive: true });
        }
    }

    /**
     * Gera um áudio a partir de um texto usando edge-tts-universal
     * @returns O caminho do arquivo .mp3 gerado
     */
    public async generateMikaAudio(text: string): Promise<string> {
        const fileName = `mika_${Date.now()}.mp3`;
        const outputPath = path.join(this.tmpDir, fileName);
        
        // Limpar textos problemáticos
        const sanitizedText = text.replace(/"/g, "'").replace(/\n/g, ' ');

        logger.info(`🎙️ [TTS] Gerando áudio para: "${sanitizedText.substring(0, 50)}..."`);
        
        try {
            // Instanciar EdgeTTS com o texto e voz específicos
            const tts = new EdgeTTS(sanitizedText, this.voice);
            const result = await tts.synthesize();
            
            // Converter Blob para Buffer e salvar
            const arrayBuffer = await result.audio.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            fs.writeFileSync(outputPath, buffer);
            
            logger.info(`✅ [TTS] Áudio gerado em: ${outputPath}`);
            return outputPath;
        } catch (error: any) {
            logger.error('❌ [TTS] Erro ao gerar áudio com edge-tts-universal:', error.message || error);
            throw new Error(`Erro ao gerar áudio da Mika: ${error.message || error}`);
        }
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
