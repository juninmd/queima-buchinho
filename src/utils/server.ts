import http from 'http';
import { logger } from './logger';

// Polling heartbeat — updated by index.ts on every successful poll cycle
const POLLING_STALE_MS = 2 * 60 * 1000; // 2 minutes
let lastPollingHeartbeat = Date.now();
let pollingMode = false; // true when bot runs in polling mode

export function markPollingAlive(): void {
  lastPollingHeartbeat = Date.now();
}

export function setPollingMode(enabled: boolean): void {
  pollingMode = enabled;
  if (enabled) lastPollingHeartbeat = Date.now();
}

export class HealthServer {
  private server: http.Server;

  constructor(private port: number) {
    this.server = http.createServer((req, res) => {
      if (req.url === '/health') {
        const stale = pollingMode && (Date.now() - lastPollingHeartbeat) > POLLING_STALE_MS;
        const status = stale ? 503 : 200;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: stale ? 'degraded' : 'ok',
          polling: pollingMode ? (stale ? 'stale' : 'alive') : 'webhook',
          lastHeartbeat: new Date(lastPollingHeartbeat).toISOString(),
          timestamp: new Date().toISOString(),
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
  }

  public start(): void {
    this.server.listen(this.port, () => {
      logger.info(`🏥 Health check server rodando na porta ${this.port}`);
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('🏥 Health check server fechado');
        resolve();
      });
    });
  }
}
