import { dashboardService } from '../../services/dashboard.service';
import { dashboardAnalysisService, DashboardRange } from '../../services/dashboard-analysis.service';
import { HttpError } from '../http';
import type { Router } from '../router';

const RANGES: DashboardRange[] = ['daily', 'weekly', 'monthly'];

export function dashboardRoutes(router: Router): void {
  router
    .add('GET', '/api/dashboard/daily', ({ userId }) => dashboardService.getDailyProgress(userId))
    .add('GET', '/api/dashboard/weekly', ({ userId }) => dashboardService.getRangeProgress(userId, 7))
    .add('GET', '/api/dashboard/monthly', ({ userId }) => dashboardService.getRangeProgress(userId, 30))
    .add('GET', '/api/dashboard/analysis', async ({ userId, url }) => {
      const range = url.searchParams.get('range') as DashboardRange;
      if (!RANGES.includes(range)) throw new HttpError(400, 'invalid_range');
      return dashboardAnalysisService.getAnalysis(userId, range, url.searchParams.get('refresh') === '1');
    });
}
