import * as path from 'path';
import * as fs from 'fs';
import { mikaService } from './mika.service';

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
        return mikaService.response(
            'O Mestre nao treinou hoje. Zoar de leve e mandar fazer cardio. Curto, natural, sarcastico.'
        );
    }

    public async getCongratsMessage(): Promise<MemeResponse> {
        return mikaService.response(
            'O Mestre treinou hoje. Elogiar de forma genuina, acida e curta. Zero coach de Instagram.'
        );
    }

    public async getMorningReminder(dayOfWeek: string): Promise<MemeResponse> {
        return mikaService.response(
            `E ${dayOfWeek} de manha. Mandar bom dia natural e chamar pra vida, sem frase motivacional corporativa.`
        );
    }

    public async getConditionalReminder(time: string): Promise<MemeResponse> {
        return mikaService.response(
            `Sao ${time} e a Lenda ainda nao treinou. Cutucada ironica curta, sem drama.`
        );
    }

    public async getWaterReminder(): Promise<MemeResponse> {
        return mikaService.response('Lembrar o Mestre de beber agua agora, com zoeira leve e direta.');
    }

    public async getFoodReminder(meal: 'cafe' | 'almoco' | 'cafe_tarde' | 'jantar'): Promise<MemeResponse> {
        const mealMap = { cafe: 'cafe da manha', almoco: 'almoco', cafe_tarde: 'cafe da tarde', jantar: 'jantar' };
        return mikaService.response(`Hora do ${mealMap[meal]}. Mandar o Mestre comer, direto e sarcastico.`);
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
