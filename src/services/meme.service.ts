import * as path from 'path';
import * as fs from 'fs';
import { ollamaService } from './ollama.service';

const AUDIO_FILES = {
    MOTIVATION: 'tai-lung-como-nao-posso_NrQYPc2.mp3',
    NOT_TRAINED: ['tf_nemesis.mp3', 'voce-nao-tem-aura.mp3']
};

export interface MemeResponse {
    message: string;
    audioSearchTerm?: string;
}

export class MemeService {
    private assetsPath: string;

    constructor() {
        this.assetsPath = path.join(__dirname, '../../assets');
    }

    public async getRoastMessage(): Promise<MemeResponse> {
        const dynamic = await ollamaService.getDynamicRoast();
        if (dynamic) return dynamic;

        const messages = [
            '😤 E o treino? Ficou no sonho, foi? O buchinho não vai queimar sozinho! 🔥',
            '👀 Tô de olho nessa preguiça aí... Amanhã não quero ver desculpa, hein? 💅',
            '🤡 Parabéns pelo esforço de... não fazer nada hoje. O sedentarismo agradece.',
            'fail... O shape tá fugindo de você cada vez mais rápido. 🏃‍♂️💨',
            'A disciplina deu uma passadinha aqui e perguntou por você. Falei que tava dormindo. 🛌💤',
            'Treinar que é bom nada, né? Mas pra comer pizza você é mestre! 🍕🦦',
            'Vou começar a cobrar multa por cada dia sem treino. Já estaria rica! 💸💁‍♀️'
        ];
        return {
            message: messages[Math.floor(Math.random() * messages.length)],
            audioSearchTerm: 'sad trombone'
        };
    }

    public async getCongratsMessage(): Promise<MemeResponse> {
        const dynamic = await ollamaService.getDynamicCongrats();
        if (dynamic) return dynamic;

        const messages = [
            '🎉 BOA! O buchinho que lute agora! Tá pago! 💪🔥',
            '✨ Arrasou! Disciplina é tudo, e hoje você deu aula. Continue assim! ✨',
            '💃 Olha ela(e)! Treinada(o) e pronta(o) pra dominar o mundo! (Ou a academia)',
            '✅ Cumpriu a missão! O shape agradece a lembrança. Orgulho da mãe! 😉',
            '🔥 Mais um pra conta! O esforço de hoje é o resultado de amanhã. Voa! 🚀'
        ];
        return {
            message: messages[Math.floor(Math.random() * messages.length)],
            audioSearchTerm: 'congratulations'
        };
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
