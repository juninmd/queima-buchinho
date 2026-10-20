import { Router } from '../router';
import { dashboardRoutes } from './dashboard';
import { fichaRoutes } from './ficha';
import { habitsRoutes } from './habits';
import { metricsRoutes } from './metrics';
import { mikaRoutes } from './mika';
import { pauseRoutes } from './pause';
import { pushRoutes } from './push';
import { todayRoutes } from './today';

export function buildRouter(): Router {
  const router = new Router();
  [dashboardRoutes, todayRoutes, habitsRoutes, fichaRoutes, metricsRoutes, pauseRoutes, mikaRoutes, pushRoutes]
    .forEach(register => register(router));
  return router;
}
