import { clearConfig, loadConfig, saveConfig } from './api';

export interface PairingLink { baseUrl: string; code: string }
const TIMEOUT_MS = 10_000;

/** Lê o link do QR (`queima://pair?v=1&u=<url>&c=<código>`). Só https (ou localhost). null = QR inválido. */
export function parsePairingLink(text: string): PairingLink | null {
  try {
    const u = new URL(text.trim());
    if (u.protocol !== 'queima:' || u.host !== 'pair' || u.searchParams.get('v') !== '1') return null;
    const base = new URL(u.searchParams.get('u') ?? '');
    const code = u.searchParams.get('c') ?? '';
    const local = base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname);
    if (!(base.protocol === 'https:' || local) || base.username || base.password || !/^qbp_[\w-]{20,80}$/.test(code)) return null;
    return { baseUrl: base.origin, code };
  } catch { return null; }
}

/** Troca o código do QR pelo token de dispositivo e guarda a conexão. Lança Error com mensagem para a tela. */
export async function pairWith(link: PairingLink, name = 'Android'): Promise<void> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${link.baseUrl}/auth/pair`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: link.code, name }), signal: ctl.signal });
    if (res.status === 401) throw new Error('QR expirado ou já usado. Gere outro no servidor (bun run pair).');
    if (res.status === 429) throw new Error('Muitas tentativas. Aguarde um minuto.');
    if (!res.ok) throw new Error(`Servidor recusou o pareamento (HTTP ${res.status}).`);
    const { token } = (await res.json()) as { token?: string };
    if (!token) throw new Error('Resposta inválida do servidor.');
    saveConfig({ baseUrl: link.baseUrl, token });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Servidor não respondeu.');
    throw e;
  } finally { clearTimeout(timer); }
}

/** Abre a câmera, lê o QR e pareia. Só funciona no app mobile (o plugin não existe no desktop). */
export async function scanAndPair(): Promise<void> {
  const { scan, Format, checkPermissions, requestPermissions } = await import('@tauri-apps/plugin-barcode-scanner').catch(() => { throw new Error('Leitor de QR indisponível neste dispositivo. Use o app Android.'); });
  if ((await checkPermissions()) !== 'granted' && (await requestPermissions()) !== 'granted') throw new Error('Permita o uso da câmera para escanear o QR.');
  const r = await scan({ formats: [Format.QRCode] });
  const link = parsePairingLink(r.content);
  if (!link) throw new Error('Este QR não é de pareamento do Queima.');
  await pairWith(link);
}

/** Desfaz o pareamento: revoga o token no servidor (se der) e apaga a conexão local. */
export async function unpair(): Promise<void> {
  const cfg = loadConfig();
  if (cfg) await fetch(`${cfg.baseUrl}/auth/unpair`, { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => undefined);
  clearConfig();
}
