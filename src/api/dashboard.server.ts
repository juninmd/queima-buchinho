import http from 'http';
import { logger } from '../utils/logger';
import { CORS_HEADERS, HttpError, isAuthorized, send } from './http';
import { Router } from './router';
import { buildRouter } from './routes';
import { servePwa } from './static';

/** API do app (PWA/dashboard) + arquivos estáticos do PWA, na mesma porta. */
export class DashboardApiServer {
  private server: http.Server;
  private router: Router = buildRouter();

  constructor(private port: number, private userId: number) {
    this.server = http.createServer((req, res) => void this.handle(req, res));
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    const pathname = (req.url ?? '/').split('?')[0];
    if (!pathname.startsWith('/api/')) {
      if (!(await servePwa(req, res).catch(() => false))) send(res, 404, { error: 'not_found' });
      return;
    }

    if (!isAuthorized(req)) {
      send(res, 401, { error: 'unauthorized' });
      return;
    }

    try {
      send(res, 200, await this.router.dispatch(req, this.userId));
    } catch (e) {
      if (e instanceof HttpError) {
        send(res, e.status, { error: e.code });
        return;
      }
      logger.error('Erro na Dashboard API:', e);
      send(res, 500, { error: 'internal_error' });
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        logger.info(`📊 Dashboard API rodando na porta ${this.port}`);
        resolve();
      });
    });
  }

  /** Porta efetiva (útil quando criado com porta 0). */
  public address(): number | null {
    const addr = this.server.address();
    return addr && typeof addr === 'object' ? addr.port : null;
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
