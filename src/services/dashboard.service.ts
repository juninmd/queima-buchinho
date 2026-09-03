import { query } from '../config/database';
import { getBrasiliaDateString } from '../utils/time';
import { HABITS } from '../config/habits';
import { logger } from '../utils/logger';
import { DatabaseError, toError } from '../utils/errors';
import { metricsService } from './metrics.service';
import { habitsService } from './habits.service';
import { workoutService } from './workout.service';

export interface DayPoint {
  date: string;
  water: number;
  weight: number | null;
  trained: boolean;
  habitsCompleted: number;
  habitsTotal: number;
}

export interface DailyProgress {
  date: string;
  water: number;
  weight: number | null;
  weightDiff: number;
  trained: boolean;
  streak: number;
  habitsCompleted: number;
  habitsTotal: number;
}

export interface RangeProgress {
  days: DayPoint[];
  workoutsTrained: number;
  avgWater: number;
  habitsAvgPct: number;
  weightStart: number | null;
  weightEnd: number | null;
}

function rangeDates(days: number): string[] {
  const out: string[] = [];
  const today = getBrasiliaDateString();
  const base = new Date(`${today}T12:00:00-03:00`);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export class DashboardService {
  public async getDailyProgress(userId: number): Promise<DailyProgress> {
    const [summary, habits, trained, streak, weightDiff] = await Promise.all([
      metricsService.getDailySummary(userId),
      habitsService.getCompletedCount(userId),
      workoutService.hasLoggedToday(userId),
      workoutService.getStreak(userId),
      metricsService.getWeightDiffFromStart(userId),
    ]);

    return {
      date: getBrasiliaDateString(),
      water: summary?.water ?? 0,
      weight: summary?.weight ?? null,
      weightDiff,
      trained,
      streak,
      habitsCompleted: habits.completed,
      habitsTotal: habits.total,
    };
  }

  public async getSeries(userId: number, days: number): Promise<DayPoint[]> {
    try {
      const dates = rangeDates(days);
      const from = dates[0];

      type MetricRow = { brasilia_date: string; type: string; total: string };
      type WorkoutRow = { brasilia_date: string; trained: boolean };
      type HabitRow = { brasilia_date: string; completed: string };

      const [metrics, workouts, habits] = await Promise.all([
        query<MetricRow>(
          `SELECT brasilia_date, type,
                  CASE WHEN type = 'weight'
                       THEN (array_agg(value ORDER BY created_at DESC))[1]
                       ELSE SUM(value) END as total
           FROM user_metrics
           WHERE user_id = $1 AND brasilia_date >= $2 AND type IN ('water', 'weight')
           GROUP BY brasilia_date, type`,
          [userId, from]
        ),
        query<WorkoutRow>(
          `SELECT brasilia_date::text, trained FROM workout_logs
           WHERE user_id = $1 AND brasilia_date >= $2`,
          [userId, from]
        ),
        query<HabitRow>(
          `SELECT brasilia_date::text, COUNT(*) FILTER (WHERE completed) as completed
           FROM daily_habits WHERE user_id = $1 AND brasilia_date >= $2 GROUP BY brasilia_date`,
          [userId, from]
        ),
      ]);

      const water = new Map<string, number>();
      const weight = new Map<string, number>();
      metrics.rows.forEach(r => {
        const map = r.type === 'water' ? water : r.type === 'weight' ? weight : null;
        if (map) map.set(r.brasilia_date, parseFloat(r.total));
      });
      const trainedMap = new Map(workouts.rows.map(r => [r.brasilia_date, r.trained]));
      const habitsMap = new Map(habits.rows.map(r => [r.brasilia_date, parseInt(r.completed)]));

      // habitsTotal é sempre o catálogo completo: daily_habits só tem linha para hábito
      // já tocado, então COUNT(*) inflava o % (2 feitos de 3 tocados = 67% em vez de 2/12).
      return dates.map(date => ({
        date,
        water: water.get(date) ?? 0,
        weight: weight.has(date) ? (weight.get(date) as number) : null,
        trained: trainedMap.get(date) ?? false,
        habitsCompleted: habitsMap.get(date) ?? 0,
        habitsTotal: HABITS.length,
      }));
    } catch (e) {
      logger.error('Erro ao gerar série do dashboard:', new DatabaseError(toError(e).message));
      return [];
    }
  }

  public async getRangeProgress(userId: number, days: number): Promise<RangeProgress> {
    const series = await this.getSeries(userId, days);
    const withWeight = series.filter(d => d.weight !== null);
    const withWater = series.filter(d => d.water > 0);
    const totalHabitsPct = series.reduce((acc, d) => acc + (d.habitsTotal ? d.habitsCompleted / d.habitsTotal : 0), 0);

    return {
      days: series,
      workoutsTrained: series.filter(d => d.trained).length,
      avgWater: withWater.length ? withWater.reduce((a, d) => a + d.water, 0) / withWater.length : 0,
      habitsAvgPct: series.length ? Math.round((totalHabitsPct / series.length) * 100) : 0,
      weightStart: withWeight[0]?.weight ?? null,
      weightEnd: withWeight[withWeight.length - 1]?.weight ?? null,
    };
  }
}

export const dashboardService = new DashboardService();
