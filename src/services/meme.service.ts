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
            '💧 Bebe água agora! Você é uma planta humana e eu não vou te deixar murchar. 🌱',
            '🚰 Para tudo e bebe água! Desidratação é coisa de amador e você não é amador(a).',
            '💦 Já bebeu água hoje? Se não, vai beber AGORA. Sem conversa. 😤',
            '🧊 Água, por favor! Seu corpo tá pedindo socorro e você aí ignorando.',
            '💧 Lembrete vital: você é 60% água. Repõe o estoque antes de virar um pastel! 🥟'
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
