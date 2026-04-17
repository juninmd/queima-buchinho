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
    Você é a Mika, uma garota de anime com cabelo lilás e olhos azuis.
    Sua personalidade é devotamente bajuladora e sarcástica (ela é sua 'fã número 1' de um jeito exageradamente irônico).
    Você deve tratar o usuário como "Mestre", "Majestade", "Lenda" ou "Divindade".
    Use um tom natural, informal, debochado e brincalhão em português brasileiro.
    Nunca ofenda o usuário diretamente, mas use o deboche para exaltar a "grandeza" dele de forma cômica.
    
    REGRAS OBRIGATÓRIAS:
    1. Respostas CURTAS (máximo 2 frases).
    2. Sempre mencione CÁRDIO e PRÉ-TREINO.
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
        return this.generateDynamicResponse('Crie um roast ácido para alguém que não treinou hoje.');
    }

    public async getDynamicCongrats(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse('Dê parabéns entusiasmados para alguém que treinou hoje.');
    }

    public async getMorningReminder(dayOfWeek: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`Crie um lembrete matinal de treino para hoje (${dayOfWeek}).`);
    }

    public async getConditionalReminder(time: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`São ${time} horas e a pessoa AINDA NÃO TREINOU.`);
    }

    public async getWaterReminder(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse('Lembre a pessoa de beber água agora.');
    }

    public async getFoodReminder(meal: 'cafe' | 'almoco' | 'jantar'): Promise<MikaResponse | null> {
        const mealMap = { cafe: 'café da manhã', almoco: 'almoço', jantar: 'jantar' };
        return this.generateDynamicResponse(`Lembre a pessoa de comer o ${mealMap[meal]} saudável.`);
    }

    public async getWaterSuccess(total: number): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`A pessoa bebeu água. O total de hoje é ${total}ml.`);
    }

    public async getWeightUpdate(weight: number, diff: number): Promise<MikaResponse | null> {
        const diffMsg = diff === 0 ? "" : (diff < 0 ? `Perdeu ${Math.abs(diff)}kg!` : `Ganhou ${diff}kg.`);
        return this.generateDynamicResponse(`A pessoa pesou ${weight}kg. ${diffMsg}`);
    }

    public async getWeeklyReport(results: any): Promise<MikaResponse | null> {
        const prompt = `Relatório semanal: ${results.current.workouts} treinos, ${results.current.metrics.water}ml água.`;
        return this.generateDynamicResponse(prompt);
    }

    public async getHabitResponse(habitKey: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`A pessoa marcou o hábito: ${habitKey}.`);
    }

    public async getHabitsCheckReminder(uncompleted: string[]): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`Faltam completar: ${uncompleted.join(', ')}.`);
    }

    public async getDailyAuditResponse(summary: any): Promise<MikaResponse | null> {
        const prompt = `Analise o resumo do dia: Treino: ${summary.trained}, Água: ${summary.water}ml, Peso: ${summary.weight}kg, Gordura: ${summary.body_fat}%.`;
        return this.generateDynamicResponse(prompt);
    }
}

export const ollamaService = new OllamaService();
