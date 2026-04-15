import { Ollama } from 'ollama';
import { logger } from '../utils/logger';

export interface MikaResponse {
    message: string;
    audioSearchTerm: string;
}

const ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const ollama = new Ollama({ host: ollamaHost });

export class OllamaService {
    private readonly model = 'gemma3:1b';
    private readonly systemPrompt = `Você é a Mika, ácida e sarcástica. Respostas curtas em JSON.`;

    public async generateDynamicResponse(prompt: string): Promise<MikaResponse | null> {
        logger.info(`🤖 [Ollama] Chamando IA em ${ollamaHost} com o prompt: "${prompt.substring(0, 50)}..."`);
        try {
            const response = await ollama.chat({
                model: this.model,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: prompt }
                ],
                format: 'json'
            });

            const content = response.message.content.trim();
            logger.info('✅ [Ollama] Resposta da IA recebida com sucesso.');
            return JSON.parse(content) as MikaResponse;
        } catch (error: any) {
            logger.error(`❌ [Ollama] Erro fatal na conexão com ${ollamaHost}:`, error.message);
            return null;
        }
    }

    public async getDynamicRoast(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse('Crie um roast ácido para alguém que não treinou.');
    }

    // ... outros métodos seguem o mesmo padrão de log
    public async getMorningReminder(dayOfWeek: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`Lembrete matinal de ${dayOfWeek}.`);
    }

    public async getWaterReminder(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse('Lembre de beber água.');
    }

    public async getFoodReminder(meal: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`Lembre da refeição: ${meal}.`);
    }

    public async getHabitsCheckReminder(uncompleted: string[]): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`Bronca pelos hábitos: ${uncompleted.join(', ')}.`);
    }
}

export const ollamaService = new OllamaService();
