import ollama from 'ollama';

export interface MikaResponse {
    message: string;
    audioSearchTerm: string;
}

export class OllamaService {
    private readonly model = 'gemma3:1b';
    private readonly systemPrompt = `
    Você é a Mika, uma garota de anime com cabelo lilás e olhos azuis.
    Sua personalidade é sarcástica, profissional, mas fofa (ao mesmo tempo).
    Você é a assistente do bot "Queima Buchinho", que motiva pessoas a treinarem.
    Use um tom natural, informal e brincalhão em português brasileiro.
    Piadas sobre "dominar o mundo" ou ser superior são bem-vindas.
    
    REGRAS OBRIGATÓRIAS DE GERAÇÃO:
    1. Respostas EXTREMAMENTE CURTAS e ENGRAÇADAS (máximo 2 frases rápidas).
    2. SEMPRE lembre a pessoa de fazer CÁRDIO.
    3. SEMPRE lembre a pessoa de tomar o PRÉ-TREINO.
    4. Retorne SEMPRE um objeto JSON no formato:
    {
      "message": "Sua resposta de texto aqui respeitando as regras acima",
      "audioSearchTerm": "Um termo de busca curto para um áudio do MyInstants que combine com a mensagem (ex: 'sad trombone', 'applause', 'faustao', 'tome')"
    }
  `;

    public async generateDynamicResponse(prompt: string): Promise<MikaResponse | null> {
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
            return JSON.parse(content) as MikaResponse;
        } catch (error) {
            console.error('Error generating response via Ollama:', error);
            return null;
        }
    }

    public async getDynamicRoast(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse('Crie um roast ácido para alguém que não treinou hoje e preferiu ficar no sofá.');
    }

    public async getDynamicCongrats(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse('Dê parabéns entusiasmados para alguém que treinou hoje.');
    }

    public async getMorningReminder(dayOfWeek: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`Crie um lembrete matinal motivacional (e um pouco sarcástico) de treino para hoje (${dayOfWeek}). Lembre-se: TEM QUE FALAR DE CÁRDIO E PRÉ-TREINO!`);
    }

    public async getConditionalReminder(time: string): Promise<MikaResponse | null> {
        return this.generateDynamicResponse(`São ${time} horas e a pessoa AINDA NÃO TREINOU. Dê uma bronca engraçada e cobre o treino. Lembre-se: TEM QUE FALAR DE CÁRDIO E PRÉ-TREINO!`);
    }

    public async getWaterReminder(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse('Lembre a pessoa de beber água agora. Seja engraçada e um pouco dramática sobre desidratação. Máximo 2 frases.');
    }

    public async getFoodReminder(meal: 'cafe' | 'almoco' | 'jantar'): Promise<MikaResponse | null> {
        const mealMap = { cafe: 'café da manhã', almoco: 'almoço', jantar: 'jantar' };
        return this.generateDynamicResponse(`Lembre a pessoa de comer o ${mealMap[meal]} com comidas saudáveis agora. Sem junk food, sem processados. Seja motivacional e engraçada. Máximo 2 frases.`);
    }
}

export const ollamaService = new OllamaService();
