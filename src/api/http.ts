import http from 'http';
import { timingSafeEqual } from 'crypto';

export const MAX_BODY_BYTES = 32 * 1024;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.DASHBOARD_CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
};

/** Erro com status HTTP: o router converte em `{ error: code }`. */
export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
    this.name = 'HttpError';
  }
}

export function send(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

export function isAuthorized(req: http.IncomingMessage): boolean {
  const token = process.env.DASHBOARD_TOKEN;
  if (!token) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const given = Buffer.from(req.headers.authorization || '');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Lê o corpo JSON com limite de tamanho. Corpo vazio vira `{}`. */
export function readJson(req: http.IncomingMessage, limit = MAX_BODY_BYTES): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let aborted = false;
    req.on('data', (chunk: Buffer) => {
      if (aborted) return;
      size += chunk.length;
      if (size > limit) {
        aborted = true;
        reject(new HttpError(413, 'payload_too_large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, 'invalid_json'));
      }
    });
    req.on('error', () => reject(new HttpError(400, 'invalid_body')));
  });
}
