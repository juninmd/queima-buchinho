import http from 'http';
import { timingSafeEqual } from 'crypto';
import { logger } from '../utils/logger';
import { dashboardService } from '../services/dashboard.service';
import { dashboardAnalysisService, DashboardRange } from '../services/dashboard-analysis.service';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.DASHBOARD_CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function send(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

function isAuthorized(req: http.IncomingMessage): boolean {
  const token = process.env.DASHBOARD_TOKEN;
  if (!token) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const given = Buffer.from(req.headers.authorization || '');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export class DashboardApiServer {
  private server: http.Server;

  constructor(private port: number, private userId: number) {
    this.server = http.createServer((req, res) => this.handle(req, res));
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (!isAuthorized(req)) {
      send(res, 401, { error: 'unauthorized' });
      return;
    }

    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      switch (url.pathname) {
        case '/api/dashboard/daily':
          send(res, 200, await dashboardService.getDailyProgress(this.userId));
          return;
        case '/api/dashboard/weekly':
          send(res, 200, await dashboardService.getRangeProgress(this.userId, 7));
          return;
        case '/api/dashboard/monthly':
          send(res, 200, await dashboardService.getRangeProgress(this.userId, 30));
          return;
        case '/api/dashboard/analysis': {
          const range = url.searchParams.get('range') as DashboardRange;
          if (!['daily', 'weekly', 'monthly'].includes(range)) {
            send(res, 400, { error: 'invalid_range' });
            return;
          }
          const refresh = url.searchParams.get('refresh') === '1';
          send(res, 200, await dashboardAnalysisService.getAnalysis(this.userId, range, refresh));
          return;
        }
        default:
          send(res, 404, { error: 'not_found' });
      }
    } catch (e) {
      logger.error('Erro na Dashboard API:', e);
      send(res, 500, { error: 'internal_error' });
    }
  }

  public start(): void {
    this.server.listen(this.port, () => {
      logger.info(`📊 Dashboard API rodando na porta ${this.port}`);
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('📊 Dashboard API fechada');
        resolve();
      });
    });
  }
}
