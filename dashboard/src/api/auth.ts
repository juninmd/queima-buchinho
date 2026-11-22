import { normalizeBaseUrl } from '../lib/config';

export interface DeviceStart { deviceCode: string; userCode: string; verificationUri: string; expiresIn: number; interval: number }
export type PollResult = { status: 'pending' | 'slow_down' } | { status: 'ok'; token: string; login: string };

async function post<T>(baseUrl: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `http_${res.status}`);
  return data as T;
}

export const githubConfig = async (baseUrl: string): Promise<boolean> => {
  try { return ((await (await fetch(`${normalizeBaseUrl(baseUrl)}/auth/config`)).json()) as { github?: boolean }).github === true; }
  catch { return false; }
};
export const startGithubLogin = (baseUrl: string) => post<DeviceStart>(baseUrl, '/auth/github/device');
export const pollGithubLogin = (baseUrl: string, deviceCode: string) => post<PollResult>(baseUrl, '/auth/github/poll', { deviceCode });
