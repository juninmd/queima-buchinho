import { MAX_PAUSE_DAYS, pauseService } from '../../features/pause/pause.service';
import { HttpError } from '../http';
import { asObject, reqNumber } from '../validate';
import type { Router } from '../router';

export function pauseRoutes(router: Router): void {
  router
    .add('GET', '/api/pause', async ({ userId }) => ({ until: await pauseService.activeUntil(userId) }))
    .add('POST', '/api/pause', async ({ userId, body }) => {
      const days = reqNumber(asObject(await body()), 'days');
      if (!Number.isInteger(days) || days < 1 || days > MAX_PAUSE_DAYS) throw new HttpError(400, 'invalid_days');
      return { until: await pauseService.pause(userId, days) };
    })
    .add('DELETE', '/api/pause', async ({ userId }) => ({ resumed: await pauseService.resume(userId) }));
}
