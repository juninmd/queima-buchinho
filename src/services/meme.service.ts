import * as path from 'path';
import * as fs from 'fs';

// Configuração dos arquivos de áudio
const AUDIO_FILES = {
    MOTIVATION: 'tai-lung-como-nao-posso_NrQYPc2.mp3',
    NOT_TRAINED: ['tf_nemesis.mp3', 'voce-nao-tem-aura.mp3']
};

export class MemeService {
    private assetsPath: string;

    constructor() {
        this.assetsPath = path.join(__dirname, '../../assets');
    }

    getRoastMessage(): string {
        const messages = [
            '😤 Você não treinou hoje! Sem desculpas!',
            '👀 Estou de olho! Nada de treino hoje?',
            'fail... O shape não vem desse jeito.',
            'A disciplina te levou... a lugar nenhum hoje. 🤡'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getRoastAudio(): string | null {
        const randomAudio = AUDIO_FILES.NOT_TRAINED[Math.floor(Math.random() * AUDIO_FILES.NOT_TRAINED.length)];
        const audioPath = path.join(this.assetsPath, randomAudio);
        return fs.existsSync(audioPath) ? audioPath : null;
    }

    getMotivationAudio(): string | null {
        const audioPath = path.join(this.assetsPath, AUDIO_FILES.MOTIVATION);
        return fs.existsSync(audioPath) ? audioPath : null;
    }

    // Placeholder for future image generation integration
    // async generateMemeImage(prompt: string): Promise<string> { ... }
}

export const memeService = new MemeService();
