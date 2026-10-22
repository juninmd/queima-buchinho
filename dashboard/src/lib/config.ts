import { isNativeApp } from './native';

const KEY = 'qb.config';

export interface AppConfig { baseUrl: string; token: string }

const read = (): Storage | null => { try { return window.localStorage; } catch { return null; } };

/** Servido pelo próprio bot a origem já é a API; em dev, VITE_API_URL aponta para ela.
 *  No app nativo a origem é a do WebView (https://localhost): a URL do bot é digitada. */
export const defaultBaseUrl = (): string =>
  import.meta.env.VITE_API_URL || (isNativeApp() ? '' : window.location.origin);

export function loadConfig(): AppConfig | null {
  try {
    const raw = read()?.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as Partial<AppConfig>;
      if (c.baseUrl && c.token) return { baseUrl: c.baseUrl, token: c.token };
    }
  } catch { /* configuração corrompida: cai para o ambiente */ }
  const envToken = import.meta.env.VITE_API_TOKEN;
  return envToken ? { baseUrl: defaultBaseUrl(), token: envToken } : null;
}

export const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '');

export function saveConfig(c: AppConfig): void {
  read()?.setItem(KEY, JSON.stringify({ baseUrl: normalizeBaseUrl(c.baseUrl), token: c.token.trim() }));
}

export function clearConfig(): void { read()?.removeItem(KEY); }
