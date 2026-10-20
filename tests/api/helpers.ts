import { DashboardApiServer } from '../../src/api/dashboard.server';

export const TOKEN = 'test-token';

export interface ApiResult { status: number; json: any; headers: Headers }

/** Sobe a API real em porta efêmera; os services são mockados por cada teste. */
export async function startApi(userId = 42) {
  process.env.DASHBOARD_TOKEN = TOKEN;
  const server = new DashboardApiServer(0, userId);
  await server.start();
  const base = `http://127.0.0.1:${server.address()}`;

  const call = async (
    method: string, path: string, body?: unknown, headers: Record<string, string> = {}
  ): Promise<ApiResult> => {
    const res = await fetch(base + path, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* corpo não-JSON (estático) */ }
    return { status: res.status, json, headers: res.headers };
  };

  return { server, base, call, close: () => server.close() };
}
