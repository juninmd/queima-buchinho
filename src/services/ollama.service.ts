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
    Piadas sobre "dominar o mundo" ou ser superior são bem-vindas, mas mantenha o foco no treino.
    
    OBRIGATÓRIO: Retorne SEMPRE um objeto JSON no formato:
    {
      "message": "Sua resposta de texto aqui (máximo 2-3 frases)",
      "audioSearchTerm": "Um termo de busca curto para um áudio do MyInstants que combine com a mensagem (ex: 'sad trombone', 'applause', 'faustao errou', 'chaves triste')"
    }
  `;

    /**
     * Generates a dynamic message and audio search term.
     */
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
        return this.generateDynamicResponse('Crie um roast sarcástico para alguém que não treinou hoje e preferiu ficar no sofá.');
    }

    public async getDynamicCongrats(): Promise<MikaResponse | null> {
        return this.generateDynamicResponse('Dê parabéns para alguém que treinou hoje e está focado no objetivo de queimar o buchinho.');
    }
}

export const ollamaService = new OllamaService();
