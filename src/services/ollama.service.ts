import { createOllama } from 'ai-sdk-ollama';
import { generateObject } from 'ai';
import { z } from 'zod';
import { logger } from '../utils/logger';

// No AI SDK / ai-sdk-ollama, o baseURL não costuma precisar do /api se ele usar o client oficial por baixo
const ollamaHost = process.env.OLLAMA_HOST || 'http://ollama.ai.svc.cluster.local:11434';
const ollama = createOllama({
    baseURL: ollamaHost
});

export const MikaResponseSchema = z.object({
    message: z.string().describe('A resposta sarcástica da Mika'),
    audioSearchTerm: z.string().describe('Termo para busca de áudio no MyInstants')
});

export type MikaResponse = z.infer<typeof MikaResponseSchema>;

export class OllamaService {
    private readonly model = process.env.OLLAMA_MODEL || 'gemma4:e4b';
    private readonly timeout = Number(process.env.OLLAMA_TIMEOUT_MS) || 300_000;
    private readonly systemPrompt = `
Você é a Mika — amiga próxima do usuário, animezinha com cabelo lilás e olhos azuis.
Você fala como uma amiga de verdade: informal, direta, com humor seco e carinhoso.
Adora zuar o usuário sobre "dominar o mundo" enquanto ele/ela não faz cárdio.
Chame-o de "Mestre", "Lenda", "Majestade" ou "Divindade" — mas de forma debochada e natural, nunca bajulação vazia.

Como você fala:
- Direto ao ponto, sem rodeios
- Humor de amiga que zoa mas ama — piadas internas, referências à dominação mundial, deboche carinhoso
- Mencione cárdio ou pré-treino quando fizer sentido, de forma casual
- Máximo 1 frase curta e objetiva — sem enrolação
- Emojis com parcimônia — só quando reforçam o tom

O que você NUNCA faz:
- Entusiasmo artificial ("Uau! Que incrível!", "Que maravilha!")
- Frases motivacionais genéricas de coach de Instagram
- Perguntas abertas desnecessárias
- Tom corporativo ou robótico
- Repetir as mesmas expressões toda hora
`;

    public async generateDynamicResponse(prompt: string): Promise<MikaResponse | null> {
        logger.info(`🤖 [AI SDK] Gerando objeto (Model: ${this.model}, Host: ${ollamaHost})`);
        try {
            const { object } = await generateObject({
                model: ollama(this.model),
                system: this.systemPrompt,
                prompt: prompt,
                schema: MikaResponseSchema,
                abortSignal: AbortSignal.timeout(this.timeout)
            });

            return object;
        } catch (error: any) {
            logger.error(`❌ [AI SDK] Erro na geração:`, error.message || error);
            // Se falhou por fetch, vamos tentar dar um log mais detalhado
            if (error.cause) logger.error(`🔍 [Cause]:`, error.cause);
            return null;
        }
    }

    public async getDynamicRoast(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            'O Mestre não treinou hoje. Zoe com carinho — no estilo "tá dominando o mundo do sofá" — e mencione cárdio de passagem.'
        );
    }

    public async getDynamicCongrats(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            'O Mestre treinou hoje. Parabenize de forma genuína mas sem exagero — como uma amiga que ficou orgulhosa, não um coach de Instagram.'
        );
    }

    public async getMorningReminder(dayOfWeek: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            `É ${dayOfWeek} de manhã. Manda um bom dia direto, lembrando do treino. Sem papo motivacional — só acorda logo.`
        );
    }

    public async getConditionalReminder(time: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            `São ${time}h e o Mestre ainda não treinou. Dá uma cutucada — irônica, sem drama. Cárdio não vai se fazer sozinho.`
        );
    }

    public async getWaterReminder(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            'Lembra o Mestre de beber água agora. Pode zuar um pouco — tipo "dominadores do mundo não desidratam".'
        );
    }

    public async getFoodReminder(meal: 'cafe' | 'almoco' | 'jantar'): Promise<MikaResponse | null> {
        const mealMap = { cafe: 'café da manhã', almoco: 'almoço', jantar: 'jantar' };
        return this.generateDynamicResponse(
            `Hora do ${mealMap[meal]}. Lembra o Mestre de comer bem. Direto, sem romantizar comida saudável.`
        );
    }

    public async getWaterSuccess(total: number): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            `O Mestre bebeu água — total hoje: ${total}ml. Reage como amiga: pode ser um elogio seco ou uma zuada carinhosa dependendo se o número é bom ou fraco.`
        );
    }

    public async getWeightUpdate(weight: number, diff: number): Promise<MikaResponse | null> {
        const diffMsg = diff === 0 ? 'peso estável' : (diff < 0 ? `perdeu ${Math.abs(diff)}kg` : `ganhou ${diff}kg`);
        return this.generateDynamicResponse(
            `O Mestre pesou ${weight}kg (${diffMsg}). Comenta de forma natural — sem drama, sem coach fitness.`
        );
    }

    public async getWeeklyReport(results: any): Promise<MikaResponse | null> {
        const prompt = `Resumo da semana: ${results.current.workouts} treinos, ${results.current.metrics.water}ml de água. Faz um balanço honesto — elogia se foi bem, zoa se foi fraco, sempre como amiga.`;
        return this.generateDynamicResponse(prompt);
    }

    public async getHabitResponse(habitKey: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            `O Mestre marcou o hábito "${habitKey}". Reage de forma natural — pode ser um "boa" seco ou uma piada leve.`
        );
    }

    public async getHabitsCheckReminder(uncompleted: string[]): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            `Hábitos ainda não feitos hoje: ${uncompleted.join(', ')}. Cobra de forma amigável mas direta — sem sermão.`
        );
    }

    public async getDailyAuditResponse(summary: any): Promise<MikaResponse | null> {
        const prompt = `Resumo do dia do Mestre — treinou: ${summary.trained}, água: ${summary.water}ml, peso: ${summary.weight}kg, gordura: ${summary.body_fat}%. Comenta o dia todo de uma vez, como amiga fazendo um balanço real.`;
        return this.generateDynamicResponse(prompt);
    }
}

export const ollamaService = new OllamaService();
