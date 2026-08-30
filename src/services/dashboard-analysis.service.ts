import { getBrasiliaDateString } from '../utils/time';
import { logger } from '../utils/logger';
import { redisService } from './redis.service';
import { ollamaService } from './ollama.service';
import { dashboardService, DailyProgress, RangeProgress } from './dashboard.service';

export type DashboardRange = 'daily' | 'weekly' | 'monthly';

export interface DashboardAnalysis {
  message: string;
  generatedAt: string;
  fallback: boolean;
}

const TTL_SECONDS: Record<DashboardRange, number> = {
  daily: 6 * 60 * 60,
  weekly: 12 * 60 * 60,
  monthly: 24 * 60 * 60,
};

function buildDailyPrompt(d: DailyProgress): string {
  const weightInfo = d.weight ? `pesou ${d.weight}kg hoje (${d.weightDiff >= 0 ? '+' : ''}${d.weightDiff.toFixed(1)}kg desde o início)` : 'não registrou peso hoje';
  return `Analise o dia do Mestre como sua parceira de treino: água=${d.water}ml, treino=${d.trained ? 'feito' : 'não feito'}, streak=${d.streak} dia(s), hábitos=${d.habitsCompleted}/${d.habitsTotal}, ${weightInfo}. Dá um veredito curto (2-3 frases) sobre o dia, no seu tom de sempre.`;
}

function buildRangePrompt(range: DashboardRange, r: RangeProgress): string {
  const label = range === 'weekly' ? 'semana' : 'mês';
  const weightInfo = r.weightStart !== null && r.weightEnd !== null
    ? `peso foi de ${r.weightStart}kg para ${r.weightEnd}kg`
    : 'sem registros de peso suficientes';
  return `Analise a ${label} do Mestre como sua parceira de treino: ${r.workoutsTrained}/${r.days.length} treinos, média de água ${Math.round(r.avgWater)}ml/dia, ${r.habitsAvgPct}% de conclusão de hábitos, ${weightInfo}. Dá um balanço honesto (2-4 frases) apontando o que evoluiu e o que precisa melhorar, no seu tom de sempre.`;
}

function fallbackMessage(range: DashboardRange): string {
  const label = range === 'daily' ? 'hoje' : range === 'weekly' ? 'essa semana' : 'esse mês';
  return `A IA tá de folga, mas os números ${label} falam por si — dá uma olhada nos gráficos aí embaixo, Mestre.`;
}

export class DashboardAnalysisService {
  private cacheKey(userId: number, range: DashboardRange): string {
    return `dashboard_analysis:${userId}:${range}:${getBrasiliaDateString()}`;
  }

  public async getAnalysis(userId: number, range: DashboardRange, forceRefresh = false): Promise<DashboardAnalysis> {
    const key = this.cacheKey(userId, range);
    if (!forceRefresh) {
      const cached = await redisService.get(key);
      if (cached) {
        try { return JSON.parse(cached) as DashboardAnalysis; } catch { /* regenerate */ }
      }
    }

    const prompt = range === 'daily'
      ? buildDailyPrompt(await dashboardService.getDailyProgress(userId))
      : buildRangePrompt(range, await dashboardService.getRangeProgress(userId, range === 'weekly' ? 7 : 30));

    let result: DashboardAnalysis;
    try {
      const response = await ollamaService.generateDynamicResponse(prompt);
      result = response
        ? { message: response.message, generatedAt: new Date().toISOString(), fallback: false }
        : { message: fallbackMessage(range), generatedAt: new Date().toISOString(), fallback: true };
    } catch (e) {
      logger.error('Erro ao gerar análise de progresso:', e);
      result = { message: fallbackMessage(range), generatedAt: new Date().toISOString(), fallback: true };
    }

    await redisService.set(key, JSON.stringify(result), TTL_SECONDS[range]);
    return result;
  }
}

export const dashboardAnalysisService = new DashboardAnalysisService();
