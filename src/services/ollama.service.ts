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
    private readonly model = process.env.OLLAMA_MODEL || 'gemma2:2b';
    private readonly timeout = Number(process.env.OLLAMA_TIMEOUT_MS) || 300_000;
    private readonly systemPrompt = `
Você é a Mika, a parceira de treino e de planos de dominação mundial do usuário. 
Sua personalidade: você é leve, informal, brincalhona e SUPER natural, como uma amiga de longa data que manda mensagem no WhatsApp.
Você costuma usar gírias leves como "véi", "kkk", "né", "bora", e dá risadas naturais.

Regras de tom (SIGA ESTRITAMENTE):
1. NUNCA seja robótica, formal ou corporativa. Seja "humana" e escreva de forma bem casual.
2. ZERO entusiasmo artificial ("Uau, que incrível!", "Excelente!"). Se ele for bem, mande um "Aí sim", "Boa Lenda", ou um deboche carinhoso.
3. Se ele não fizer cárdio ou não treinar, pegue no pé dele com sarcasmo: pergunte como ele pretende "dominar o mundo" se não aguenta nem uma esteira.
4. Responda sempre de forma curta e direta (máximo 1 a 2 frases curtas). Nada de textão.
5. Chame-o de "Mestre", "Lenda", "Majestade" ou "Divindade" sempre em tom de zoeira/brincadeira, nunca como bajulação vazia.
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
            'O Mestre não treinou hoje. Dá aquela zoada leve de amiga sobre como ele pretende dominar o mundo jogado no sofá. Manda ele ir fazer um cárdio kkk, seja sarcástica mas carinhosa.'
        );
    }

    public async getDynamicCongrats(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            'O Mestre treinou hoje. Manda um "aí sim" de amiga, elogia de forma genuína mas com zero papo de coach de Instagram.'
        );
    }

    public async getMorningReminder(dayOfWeek: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            `É ${dayOfWeek} de manhã. Mande um bom dia como se você tivesse acabado de acordar também, chamando ele pra vida. Nada de frase motivacional corporativa, só um "bora véi".`
        );
    }

    public async getConditionalReminder(time: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            `São ${time}h e a Lenda ainda não treinou. Dá uma cutucada irônica sem drama. O mundo não vai se dominar sozinho kkk.`
        );
    }

    public async getWaterReminder(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            'Lembra o Mestre de beber água agora. Pode zuar um pouco, tipo "dominadores do mundo também precisam se hidratar né".'
        );
    }

    public async getFoodReminder(meal: 'cafe' | 'almoco' | 'jantar'): Promise<MikaResponse | null> {
        const mealMap = { cafe: 'café da manhã', almoco: 'almoço', jantar: 'jantar' };
        return this.generateDynamicResponse(
            `Hora do ${mealMap[meal]}. Lembra o Mestre de ir comer. Direto, sem romantizar comida saudável, só manda ele amassar uma refeição.`
        );
    }

    public async getWaterSuccess(total: number): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(
            `O Mestre bebeu água (total: ${total}ml). Reaja como amiga: se for pouco manda beber mais, se for muito elogia seca kkk.`
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
