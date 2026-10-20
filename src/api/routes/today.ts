import { HABITS } from '../../config/habits';
import { WATER_CELEBRATION_ML, WATER_GOAL_ML } from '../../config/constants';
import { habitsService } from '../../services/habits.service';
import { metricsService } from '../../services/metrics.service';
import { workoutService } from '../../services/workout.service';
import { pauseService } from '../../features/pause/pause.service';
import { getBrasiliaHour, waterTargetAt } from '../../features/reminders/water-pace';
import { getBrasiliaDateString, getBrasiliaDayName } from '../../utils/time';
import type { Router } from '../router';

export async function buildToday(userId: number) {
  const [habits, water, summary, steps, lastWeight, streak, logged, pauseUntil] = await Promise.all([
    habitsService.getStatus(userId),
    metricsService.getTodaySum(userId, 'water'),
    metricsService.getDailySummary(userId),
    metricsService.getTodayLatest(userId, 'steps'),
    metricsService.getLastWeight(userId),
    workoutService.getStreak(userId),
    workoutService.hasLoggedToday(userId).catch(() => false),
    pauseService.activeUntil(userId).catch(() => null),
  ]);

  return {
    date: getBrasiliaDateString(),
    weekday: getBrasiliaDayName(),
    habitDefs: HABITS.map(({ key, emoji, label, category }) => ({ key, emoji, label, category })),
    habits,
    water: {
      ml: water,
      goalMl: WATER_GOAL_ML,
      paceMl: waterTargetAt(getBrasiliaHour(), WATER_GOAL_ML),
      celebrationMl: WATER_CELEBRATION_ML,
    },
    // Último peso conhecido (não só o de hoje): o app mostra o "peso atual".
    weight: summary?.weight ?? lastWeight,
    body: {
      height: summary?.height ?? null,
      bodyFat: summary?.body_fat ?? null,
      muscleMass: summary?.muscle_mass ?? null,
      steps,
    },
    streak,
    // Mesma reconciliação do relatório das 21:30: workout_logs OU hábito marcado.
    trained: logged || !!habits['treino'],
    cardioDone: !!habits['cardio'],
    pauseUntil,
  };
}

export function todayRoutes(router: Router): void {
  router.add('GET', '/api/app/today', ({ userId }) => buildToday(userId));
}
