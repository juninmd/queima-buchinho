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
            '🛐 Mestre, seu descanso de hoje foi tão majestoso que até os halteres sentiram sua falta. O mundo aguarda sua volta divina! 👑',
            '✨ Majestade, sua aura é tão poderosa que o treino de amanhã será épico. O pré-treino já está em posição de oração! 🙏',
            '🛐 Lenda, você está apenas poupando energias para dominar o mundo, eu sei! O cárdio será apenas um detalhe da sua glória. ✨',
            '👑 Divindade, seu buchinho é apenas um reservatório de poder! Mas vamos agraciar a academia amanhã? Por favorzinho? 👉👈',
            '✨ A disciplina está lá fora batendo na porta, mas eu disse que você está ocupado sendo lendário(a)! 🛌💤',
            '🛐 Oh, grande mestre do sedentarismo momentâneo! Sua pizza foi um sacrifício aceitável pela sua grandeza. 🍕🦦',
            '👑 Vou começar a cobrar tributos pela sua presença imperial aqui! Cada dia sem treino é uma honra para o sofá. 💸💁‍♀️'
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
            '🎉 ALELUIA! O Mestre treinou! O mundo agora é um lugar melhor. Tá pago, divindade! 💪🔥',
            '✨ Simplesmente impecável! Vossa excelência destruiu no treino hoje. Orgulho da sua fã número 1! ✨',
            '💃 É disso que eu estou falando! A lenda está em movimento. O mundo vai tremer! 🛐',
            '✅ Missão cumprida com a perfeição de um deus! O shape está vindo te pedir autógrafo. 😉',
            '🔥 Mais um degrau rumo ao trono! Sua determinação é a minha maior inspiração. Voa, Mestre! 🚀'
        ];
        return {
            message: messages[Math.floor(Math.random() * messages.length)],
            audioSearchTerm: 'congratulations'
        };
    }

    public async getMorningReminder(dayOfWeek: string): Promise<MemeResponse> {
        const dynamic = await ollamaService.getMorningReminder(dayOfWeek);
        if (dynamic) return dynamic;

        return {
            message: `Bom dia! Hoje é ${dayOfWeek}. Levanta logo, toma esse pré-treino e vai fazer um cárdio! O shape não vem sozinho. 🏃‍♀️💨`,
            audioSearchTerm: 'tome'
        };
    }

    public async getConditionalReminder(time: string): Promise<MemeResponse> {
        const dynamic = await ollamaService.getConditionalReminder(time);
        if (dynamic) return dynamic;

        return {
            message: `Já são ${time} e você não treinou ainda? Tô de olho! Vai logo tomar o pré-treino e não esquece do cárdio! 😤🔥`,
            audioSearchTerm: 'sad trombone'
        };
    }

    public async getWaterReminder(): Promise<MemeResponse> {
        const dynamic = await ollamaService.getWaterReminder();
        if (dynamic) return dynamic;

        const messages = [
            '💧 Divindade, hidrate seu corpo sagrado agora! Você é o templo que eu protejo. 🌱',
            '🚰 Majestade, pare tudo e beba água! Um mestre como você não pode desidratar.',
            '💦 Mestre, a água é o elixir da sua energia infinita! Beba agora, eu imploro. 😤',
            '🧊 Água para a lenda! Seu corpo divino agradece a atenção, mestre.',
            '💧 Lembrete vital para o ser superior: hidrate-se para que sua glória nunca se apague! 🥟'
        ];
        return {
            message: messages[Math.floor(Math.random() * messages.length)],
            audioSearchTerm: 'agua'
        };
    }

    public async getFoodReminder(meal: 'cafe' | 'almoco' | 'jantar'): Promise<MemeResponse> {
        const dynamic = await ollamaService.getFoodReminder(meal);
        if (dynamic) return dynamic;

        const messages: Record<string, string[]> = {
            cafe: [
                '🌅 Bom dia! Café da manhã saudável agora: proteína, fruta, aveia. Nada de biscoito recheado, hein! 🙅‍♀️',
                '☀️ Acorda e alimenta! Ovo, fruta, iogurte — o corpo precisa de combustível de qualidade. 🥚🍌'
            ],
            almoco: [
                '🥗 Hora do almoço! Capricha no prato: arroz integral, proteína, legumes. Fastfood é cilada! 🚫🍔',
                '🍽️ Almoço saudável agora! Metade do prato de vegetais, proteína magra e bora. Sem frituras! 🥦🍗'
            ],
            jantar: [
                '🌙 Hora do jantar! Leve e nutritivo: proteína, legumes, nada de carboidrato pesado à noite. 🥗',
                '🌛 Janta saudável! Seu corpo vai reparar os músculos enquanto dorme — alimenta direito! 💪🥦'
            ]
        };
        const opts = messages[meal];
        return {
            message: opts[Math.floor(Math.random() * opts.length)],
            audioSearchTerm: 'healthy'
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
}

export const memeService = new MemeService();
