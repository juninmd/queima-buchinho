import http from 'http';
import { createHmac, timingSafeEqual } from 'crypto';
import { HttpError, readJson, send } from './http';

/**
 * Login com GitHub (Device Flow: serve PWA e APK sem redirect nem client secret) restrito a um
 * usuário. O servidor troca o login por uma sessão assinada (HMAC) usada como Bearer na API.
 * O DASHBOARD_TOKEN continua valendo como credencial interna (cron/automação), sem GitHub.
 */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GITHUB_TIMEOUT_MS = 10_000;

export const githubClientId = (): string => process.env.GITHUB_CLIENT_ID?.trim() || '';
export const allowedGithubUser = (): string => (process.env.GITHUB_ALLOWED_USER?.trim() || 'juninmd').toLowerCase();
const secret = (): string => process.env.SESSION_SECRET?.trim() || process.env.DASHBOARD_TOKEN?.trim() || '';

/** A API só sobe se houver alguma forma de autenticar. */
export const authConfigured = (): boolean => !!(process.env.DASHBOARD_TOKEN || (githubClientId() && secret()));

const b64 = (s: string | Buffer): string => Buffer.from(s).toString('base64url');
const mac = (payload: string): string => createHmac('sha256', secret()).update(payload).digest('base64url');

export function signSession(login: string, now = Date.now()): string {
  const payload = b64(JSON.stringify({ sub: login.toLowerCase(), exp: now + SESSION_TTL_MS }));
  return `qb1.${payload}.${mac(payload)}`;
}

export function verifySession(token: string, now = Date.now()): boolean {
  if (!secret() || !token.startsWith('qb1.')) return false;
  const [, payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; exp?: number };
    return sub === allowedGithubUser() && typeof exp === 'number' && exp > now;
  } catch { return false; }
}

const safeEq = (a: string, b: string): boolean => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Token interno (DASHBOARD_TOKEN) ou sessão GitHub válida. */
export function isAuthorized(req: http.IncomingMessage): boolean {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  const given = header.slice(7);
  const internal = process.env.DASHBOARD_TOKEN;
  if (internal && safeEq(given, internal)) return true;
  return verifySession(given);
}

// Rate limit simples (por IP) nas rotas públicas de login.
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string, now = Date.now()): boolean {
  const h = hits.get(ip);
  if (!h || h.reset < now) { hits.set(ip, { n: 1, reset: now + 60_000 }); return false; }
  return ++h.n > 30;
}

async function gh<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS), headers: { Accept: 'application/json', 'User-Agent': 'queima-buchinho', ...(init.headers as Record<string, string>) } });
  if (!res.ok) throw new HttpError(502, 'github_error');
  return (await res.json()) as T;
}

/** Rotas públicas `/auth/*`. Devolve true se tratou o pedido. */
export async function handleAuth(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<boolean> {
  if (!pathname.startsWith('/auth/')) return false;
  try {
    if (pathname === '/auth/config' && req.method === 'GET') {
      send(res, 200, { github: !!(githubClientId() && secret()), allowedUser: allowedGithubUser() });
      return true;
    }
    if (req.method !== 'POST' || !['/auth/github/device', '/auth/github/poll'].includes(pathname)) throw new HttpError(404, 'not_found');
    if (!githubClientId() || !secret()) throw new HttpError(503, 'github_login_disabled');
    if (limited(req.socket.remoteAddress ?? '?')) throw new HttpError(429, 'too_many_requests');

    if (pathname === '/auth/github/device') {
      const d = await gh<{ device_code: string; user_code: string; verification_uri: string; expires_in: number; interval: number }>(
        'https://github.com/login/device/code',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: githubClientId(), scope: 'read:user' }) });
      send(res, 200, { deviceCode: d.device_code, userCode: d.user_code, verificationUri: d.verification_uri, expiresIn: d.expires_in, interval: d.interval });
      return true;
    }

    const body = (await readJson(req)) as { deviceCode?: unknown };
    if (typeof body.deviceCode !== 'string' || !body.deviceCode) throw new HttpError(400, 'invalid_device_code');
    const t = await gh<{ access_token?: string; error?: string }>(
      'https://github.com/login/oauth/access_token',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: githubClientId(), device_code: body.deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }) });
    if (!t.access_token) {
      const pending = ['authorization_pending', 'slow_down'].includes(t.error ?? '');
      send(res, pending ? 200 : 400, pending ? { status: t.error === 'slow_down' ? 'slow_down' : 'pending' } : { error: t.error ?? 'github_error' });
      return true;
    }
    const user = await gh<{ login?: string }>('https://api.github.com/user', { headers: { Authorization: `Bearer ${t.access_token}` } });
    if (!user.login || user.login.toLowerCase() !== allowedGithubUser()) throw new HttpError(403, 'forbidden_user');
    send(res, 200, { status: 'ok', token: signSession(user.login), login: user.login });
    return true;
  } catch (e) {
    if (e instanceof HttpError) { send(res, e.status, { error: e.code }); return true; }
    send(res, 502, { error: 'github_error' });
    return true;
  }
}
