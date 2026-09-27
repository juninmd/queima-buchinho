import type { DayPoint } from '../../services/dashboard.service';

/** Números do dia já reconciliados pelo fechamento (treino = workout_logs OU daily_habits). */
export interface TodayStats {
  dayName: string;
  habitsCompleted: number;
  habitsTotal: number;
  water: number;
  waterGoal: number;
  trained: boolean;
  cardio: boolean;
  streak: number;
  nota: number;
}

export interface DashboardSnapshot extends TodayStats {
  /** YYYY-MM-DD no fuso de Brasília. */
  date: string;
  weight: number | null;
  weightDiff: number;
  week: DayPoint[];
}
