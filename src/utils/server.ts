import http from 'http';
import { logger } from './logger';

export class HealthServer {
  private server: http.Server;

  constructor(private port: number) {
    this.server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
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
