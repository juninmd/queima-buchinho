import { DIET_PLAN } from '../../config/diet';
import { habitsService } from '../../services/habits.service';
import { workoutService } from '../../services/workout.service';
import { fichaService } from '../../features/ficha/ficha.service';
import { getBrasiliaDayName } from '../../utils/time';
import { HttpError } from '../http';
import { asObject, reqNumber, reqString } from '../validate';
import type { Router } from '../router';

const ALLOWED_DELTAS = [-5, -2.5, 2.5, 5];
const MEALS = ['cafe', 'almoco', 'cafe_tarde', 'jantar'] as const;

async function status(userId: number) {
  const [logged, habits] = await Promise.all([
    workoutService.hasLoggedToday(userId).catch(() => false),
    habitsService.getStatus(userId),
  ]);
  return { trained: logged || !!habits['treino'], cardioDone: !!habits['cardio'] };
}

export function fichaRoutes(router: Router): void {
  router
    .add('GET', '/api/ficha', async ({ userId }) => ({
      ficha: await fichaService.buildToday(userId),
      ...(await status(userId)),
    }))
    .add('POST', '/api/ficha/loads', async ({ userId, body }) => {
      const data = asObject(await body());
      const exerciseKey = reqString(data, 'exerciseKey', 60);
      const delta = reqNumber(data, 'delta');
      if (!ALLOWED_DELTAS.includes(delta)) throw new HttpError(400, 'invalid_delta');

      const ficha = await fichaService.buildToday(userId);
      const ex = ficha?.exercicios.find(e => e.key === exerciseKey);
      if (!ficha || !ex || ex.cargaKg === null) throw new HttpError(400, 'invalid_exerciseKey');

      const loadKg = await fichaService.adjustLoad(userId, ex.key, ex.cargaKg, delta);
      const updated = await fichaService.buildToday(userId);
      if (updated) await fichaService.saveSession(userId, updated);
      return { loadKg };
    })
    .add('POST', '/api/ficha/done', async ({ userId }) => {
      await fichaService.completeToday(userId);
      return { trained: true };
    })
    .add('POST', '/api/ficha/cardio', async ({ userId }) => {
      await fichaService.completeCardio(userId);
      return { cardioDone: true };
    })
    .add('GET', '/api/diet', async ({ userId }) => {
      const day = getBrasiliaDayName();
      const plan = DIET_PLAN[day] ?? DIET_PLAN['segunda-feira'];
      const habits = await habitsService.getStatus(userId);
      return { day, meals: MEALS.map(key => ({ key, text: plan[key], done: !!habits[key] })) };
    });
}
