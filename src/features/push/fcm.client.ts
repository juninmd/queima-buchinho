import { createSign } from 'crypto';
import axios from 'axios';
import { logger } from '../../utils/logger';
import type { PushKind, PushPayload } from './push.types';

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const b64u = (v: string | Buffer): string => Buffer.from(v).toString('base64url');

/** Canal Android por tipo (o app cria os mesmos ids em dashboard/src/lib/native.ts). */
export const channelOf = (kind: PushKind): string => `qb-${kind}`;
/** Categoria iOS com os botões rápidos registrados pelo app. */
export const categoryOf = (kind: PushKind): string => `QB_${kind.toUpperCase()}`;

/** FCM_SERVICE_ACCOUNT aceita o JSON da conta de serviço puro ou em base64. */
function loadAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const acc = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')) as ServiceAccount;
    return acc.project_id && acc.client_email && acc.private_key ? acc : null;
  } catch {
    logger.error('[FCM] FCM_SERVICE_ACCOUNT inválida.');
    return null;
  }
}

/** Mensagem FCM v1: imagem + canal no Android; categoria, thread e imagem (via extensão) no iOS. */
export function buildMessage(token: string, kind: PushKind, p: PushPayload) {
  const data: Record<string, string> = {
    url: p.url, tag: p.tag, kind, actions: JSON.stringify(p.actions ?? []),
  };
  return {
    token,
    notification: { title: p.title, body: p.body, ...(p.image ? { image: p.image } : {}) },
    data,
    android: {
      priority: 'HIGH',
      notification: { channel_id: channelOf(kind), tag: p.tag, color: '#22c55e', ...(p.image ? { image: p.image } : {}) },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default', 'mutable-content': 1, category: categoryOf(kind), 'thread-id': kind, 'interruption-level': 'time-sensitive' } },
      ...(p.image ? { fcm_options: { image: p.image } } : {}),
    },
  };
}

export class FcmClient {
  private cached: { token: string; exp: number } | null = null;

  public isEnabled(): boolean {
    return loadAccount() !== null;
  }

  private async accessToken(acc: ServiceAccount): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cached && this.cached.exp - 60 > now) return this.cached.token;
    const claims = { iss: acc.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 };
    const unsigned = `${b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64u(JSON.stringify(claims))}`;
    const jwt = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(acc.private_key).toString('base64url')}`;
    const { data } = await axios.post(TOKEN_URL, new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt,
    }).toString(), { timeout: 10000 });
    this.cached = { token: data.access_token as string, exp: now + (data.expires_in as number) };
    return this.cached.token;
  }

  /** Devolve 'gone' quando o token morreu (app desinstalado) para o chamador limpar o banco. */
  public async send(token: string, kind: PushKind, payload: PushPayload): Promise<'ok' | 'gone' | 'error'> {
    const acc = loadAccount();
    if (!acc) return 'error';
    try {
      const bearer = await this.accessToken(acc);
      await axios.post(`https://fcm.googleapis.com/v1/projects/${acc.project_id}/messages:send`,
        { message: buildMessage(token, kind, payload) },
        { headers: { Authorization: `Bearer ${bearer}` }, timeout: 10000 });
      return 'ok';
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { error?: { status?: string } } } };
      const code = err.response?.data?.error?.status;
      if (code === 'UNREGISTERED' || code === 'NOT_FOUND') return 'gone';
      logger.warn('[FCM] Entrega falhou', { status: err.response?.status, code });
      return 'error';
    }
  }
}

export const fcmClient = new FcmClient();
