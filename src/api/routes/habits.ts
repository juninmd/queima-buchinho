import { HABIT_MAP } from '../../config/habits';
import { habitsService } from '../../services/habits.service';
import { workoutService } from '../../services/workout.service';
import { HttpError } from '../http';
import { asObject, reqBoolean } from '../validate';
import type { Router } from '../router';

export function habitsRoutes(router: Router): void {
  router
    .add('PUT', '/api/habits/:key', async ({ userId, params, body }) => {
      const key = params.key;
      if (!HABIT_MAP.has(key)) throw new HttpError(404, 'not_found');
      const completed = reqBoolean(asObject(await body()), 'completed');

      await habitsService.markHabit(userId, key, completed);
      // Igual ao botão do menu no Telegram: treino marcado também vai para workout_logs.
      if (key === 'treino') {
        if (completed) await workoutService.logWorkout(userId, true, 'App');
        else await workoutService.resetWorkout(userId);
      }
      return { habits: await habitsService.getStatus(userId) };
    })
    .add('POST', '/api/workout/reset', async ({ userId }) => {
      await workoutService.resetWorkout(userId);
      await habitsService.markHabit(userId, 'treino', false);
      return { ok: true };
    });
}
