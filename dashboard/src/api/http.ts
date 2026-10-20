import { loadConfig } from '../lib/config';

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(`${code} (HTTP ${status})`); }
}
/** Falha de rede (offline, servidor fora): é o único erro que vale reenviar depois. */
export class NetworkError extends Error {}

export interface RequestOptions { idempotencyKey?: string; signal?: AbortSignal }

export async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const cfg = loadConfig();
  if (!cfg) throw new ApiError(401, 'not_configured');
  const headers: Record<string, string> = { Authorization: `Bearer ${cfg.token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, {
      method, headers, signal: opts.signal, body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new NetworkError('network');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'http_error');
  return data as T;
}

export const isRetryable = (e: unknown): boolean => e instanceof NetworkError;
