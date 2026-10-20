/** Tipos do contrato da API do app: manter em sincronia com docs/pwa/API.md. */
export type HabitCategory = 'fitness' | 'nutrition' | 'wellness';
export interface HabitDef { key: string; emoji: string; label: string; category: HabitCategory }

export interface AppToday {
  date: string;
  weekday: string;
  habitDefs: HabitDef[];
  habits: Record<string, boolean>;
  water: { ml: number; goalMl: number; paceMl: number; celebrationMl: number };
  weight: number | null;
  body: { height: number | null; bodyFat: number | null; muscleMass: number | null; steps: number };
  streak: number;
  trained: boolean;
  cardioDone: boolean;
  pauseUntil: string | null;
}

export interface FichaExercise {
  key: string; nome: string; aparelho: string; img: string; series: number; reps: string;
  descansoS: number; cargaKg: number | null;
}
export interface Ficha {
  planKey: string; emoji: string; titulo: string; foco: string; metodo: string; data: string;
  exercicios: FichaExercise[];
}
export interface FichaState { ficha: Ficha | null; trained: boolean; cardioDone: boolean }

export type MealKey = 'cafe' | 'almoco' | 'cafe_tarde' | 'jantar';
export interface Diet { day: string; meals: { key: MealKey; text: string; done: boolean }[] }

export type MetricType = 'water' | 'weight' | 'steps' | 'height' | 'body_fat' | 'muscle_mass';
export interface MetricResult { id: number; total?: number }
export type QuickLogResult =
  | { kind: 'water' | 'weight'; id: number; message: string }
  | { kind: 'workout' | 'cardio'; needsConfirm: true }
  | { kind: 'none' };

export interface MediaItem { url: string; preview: string; title: string }
export interface PushPrefs { ficha: boolean; agua: boolean; refeicao: boolean; fechamento: boolean }
export interface PushConfig { enabled: boolean; publicKey: string | null }
