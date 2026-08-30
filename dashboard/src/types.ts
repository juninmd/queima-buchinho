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

export type DashboardRange = 'daily' | 'weekly' | 'monthly';

export interface DashboardAnalysis {
  message: string;
  generatedAt: string;
  fallback: boolean;
}
