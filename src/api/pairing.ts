import http from 'http';
import { HttpError, readJson, send } from './http';
import { redeemPairingCode, revokeByToken } from './pairing.store';

/** Rotas públicas `/auth/pair` (troca o código do QR por token de dispositivo) e `/auth/unpair`. */
const hits = new Map<string, { n: number; reset: number }>();
const MAX_PER_MIN = 10;

export function limited(ip: string, now = Date.now()): boolean {
  const h = hits.get(ip);
  if (!h || h.reset < now) { hits.set(ip, { n: 1, reset: now + 60_000 }); return false; }
  return ++h.n > MAX_PER_MIN;
}

export async function handlePairing(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<boolean> {
  if (pathname !== '/auth/pair' && pathname !== '/auth/unpair') return false;
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
    if (limited(req.socket.remoteAddress ?? '?')) throw new HttpError(429, 'too_many_requests');
    if (pathname === '/auth/unpair') {
      const t = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (!t.startsWith('qbd_') || !(await revokeByToken(t))) throw new HttpError(401, 'unauthorized');
      send(res, 200, { status: 'revoked' });
      return true;
    }
    const body = (await readJson(req)) as { code?: unknown; name?: unknown };
    if (typeof body.code !== 'string' || !body.code.startsWith('qbp_') || body.code.length > 100) throw new HttpError(400, 'invalid_code');
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Dispositivo';
    const r = await redeemPairingCode(body.code, name);
    if (!r) throw new HttpError(401, 'invalid_code'); // inválido, expirado ou já usado: mesma resposta
    send(res, 200, { token: r.token, deviceId: r.id, expiresAt: r.expiresAt });
    return true;
  } catch (e) {
    if (e instanceof HttpError) { send(res, e.status, { error: e.code }); return true; }
    send(res, 500, { error: 'internal_error' });
    return true;
  }
}
