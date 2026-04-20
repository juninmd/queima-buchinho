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
        return dynamic ?? { message: 'Sem treino hoje, Lenda. O cárdio tá esperando. 🛋️', audioSearchTerm: 'sad trombone' };
    }

    public async getCongratsMessage(): Promise<MemeResponse> {
        const dynamic = await ollamaService.getDynamicCongrats();
        return dynamic ?? { message: 'Treinou! Tá pago. 💪', audioSearchTerm: 'congratulations' };
    }

    public async getMorningReminder(dayOfWeek: string): Promise<MemeResponse> {
        const dynamic = await ollamaService.getMorningReminder(dayOfWeek);
        return dynamic ?? { message: `Bom dia, Lenda. Hoje é ${dayOfWeek} — pré-treino, cárdio, nessa ordem. 🏃`, audioSearchTerm: 'tome' };
    }

    public async getConditionalReminder(time: string): Promise<MemeResponse> {
        const dynamic = await ollamaService.getConditionalReminder(time);
        return dynamic ?? { message: `${time}h e sem treino. O cárdio tá te esperando. 🙄`, audioSearchTerm: 'sad trombone' };
    }

    public async getWaterReminder(): Promise<MemeResponse> {
        const dynamic = await ollamaService.getWaterReminder();
        return dynamic ?? { message: 'Bebe água agora, Lenda. 💧', audioSearchTerm: 'agua' };
    }

    public async getFoodReminder(meal: 'cafe' | 'almoco' | 'jantar'): Promise<MemeResponse> {
        const dynamic = await ollamaService.getFoodReminder(meal);
        const fallbacks = { cafe: 'Café da manhã — come de verdade, sem biscoito recheado. 🥚', almoco: 'Hora do almoço. Proteína e legume, Majestade. 🥗', jantar: 'Janta leve, Mestre. O corpo agradece. 🌙' };
        return dynamic ?? { message: fallbacks[meal], audioSearchTerm: 'healthy' };
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
}

export const memeService = new MemeService();
