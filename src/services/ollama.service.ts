import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { ExternalServiceError, toError } from '../utils/errors';

if (!process.env.LITELLM_BASE_URL || !process.env.LITELLM_API_KEY) {
  logger.warn(
    '⚠️ [AI SDK] LITELLM_BASE_URL/LITELLM_API_KEY ausentes — chamadas à Mika vão falhar (response unavailable)'
  );
}

const litellm = createOpenAICompatible({
  name: 'litellm',
  apiKey: process.env.LITELLM_API_KEY ?? '',
  baseURL: process.env.LITELLM_BASE_URL ?? '',
});

export const MikaResponseSchema = z.object({
  message: z.string().describe('A resposta sarcástica da Mika'),
  audioSearchTerm: z.string().describe('Termo para busca de áudio no MyInstants')
});

export type MikaResponse = z.infer<typeof MikaResponseSchema>;

function parseMikaResponse(text: string): MikaResponse {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('LiteLLM response did not contain JSON');
  }

  return MikaResponseSchema.parse(JSON.parse(text.slice(start, end + 1)));
}

export class OllamaService {
  private readonly model = process.env.AI_MODEL || 'gemini-2.5-flash-lite';
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
    logger.info(`🤖 [AI SDK] Gerando objeto (Model: ${this.model})`);
    try {
      // litellm backends (NVIDIA NIM/ollama) não forçam json_schema, então
      // generateObject devolve prosa/chaves erradas. Usar prompt-based JSON.
      const { text } = await generateText({
        model: litellm(this.model),
        system: `${this.systemPrompt}
Responda somente JSON valido, sem markdown, no formato:
{"message":"texto curto","audioSearchTerm":"termo curto"}`,
        prompt: prompt,
        abortSignal: AbortSignal.timeout(this.timeout)
      });

      return parseMikaResponse(text);
    } catch (e) {
      const err = toError(e);
      const svcErr = new ExternalServiceError('LiteLLM', err.message, { cause: (e as any)?.cause });
      logger.error(`❌ [AI SDK] Erro na geração:`, svcErr);
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

  public async getFoodReminder(meal: 'cafe' | 'almoco' | 'cafe_tarde' | 'jantar'): Promise<MikaResponse | null> {
    const mealMap = { cafe: 'café da manhã', almoco: 'almoço', cafe_tarde: 'café da tarde', jantar: 'jantar' };
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
    const HABIT_CONTEXT: Record<string, string> = {
      treino: 'treino de força na academia',
      cardio: 'exercício cardiovascular',
      alongamento: 'flexibilidade e mobilidade',
      leitura: 'leitura e desenvolvimento intelectual',
      meditacao: 'saúde mental e foco',
      suplemento: 'suplementação e nutrição',
      cafe: 'café da manhã nutritivo',
      almoco: 'almoço dentro da dieta',
      jantar: 'jantar equilibrado',
    };
    const context = HABIT_CONTEXT[habitKey] || habitKey;
    return this.generateDynamicResponse(
      `O Mestre acabou de marcar "${context}". Reage como amiga — pode ser um "boa" seco, um elogio de dois segundos, ou uma piada leve sobre aquele hábito específico.`
    );
  }

  public async getHabitsCheckReminder(uncompleted: string[]): Promise<MikaResponse | null> {
    return this.generateDynamicResponse(
      `Hábitos ainda não feitos hoje: ${uncompleted.join(', ')}. Cobra de forma amigável mas direta — sem sermão.`
    );
  }

  public async getDailyAuditResponse(summary: {
    trained: boolean;
    water?: number;
    weight?: number | null;
    body_fat?: number | null;
    streak?: number;
    habitsCompleted?: number;
    habitsTotal?: number;
  }): Promise<MikaResponse | null> {
    const streakInfo = summary.streak ? `streak de ${summary.streak} dias` : 'sem streak ativo';
    const habitsInfo = summary.habitsCompleted !== undefined
      ? `${summary.habitsCompleted}/${summary.habitsTotal} hábitos feitos`
      : 'hábitos não informados';
    const prompt = `Balanço do dia do Mestre: treinou=${summary.trained}, água=${summary.water ?? 0}ml, ${habitsInfo}, ${streakInfo}${summary.weight ? `, peso=${summary.weight}kg` : ''}. Faz um balanço honesto em 1-2 frases — zoa se foi fraco, elogia se foi consistente.`;
    return this.generateDynamicResponse(prompt);
  }
}

export const ollamaService = new OllamaService();
