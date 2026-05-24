import { ollamaService, MikaResponse } from './ollama.service';

export class MikaService {
  public async response(prompt: string): Promise<MikaResponse> {
    const response = await ollamaService.generateDynamicResponse(prompt);
    if (!response) throw new Error('Mika LLM response unavailable');
    return response;
  }
}

export const mikaService = new MikaService();
