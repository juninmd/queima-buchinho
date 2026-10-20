import webpush from 'web-push';
import { query } from '../../config/database';
import { logger } from '../../utils/logger';
import { normalizePrefs } from './push.types';
import type { PushKind, PushPayload, PushPrefs, PushSubscriptionInput } from './push.types';

interface SubRow { endpoint: string; p256dh: string; auth: string; prefs: unknown }

const GONE = [404, 410];

export class PushService {
  private configured = false;

  public isEnabled(): boolean {
    return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  }

  public publicKey(): string | null {
    return this.isEnabled() ? process.env.VAPID_PUBLIC_KEY ?? null : null;
  }

  private setup(): void {
    if (this.configured) return;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      process.env.VAPID_PUBLIC_KEY as string,
      process.env.VAPID_PRIVATE_KEY as string
    );
    this.configured = true;
  }

  public async subscribe(userId: number, sub: PushSubscriptionInput, prefs?: unknown): Promise<void> {
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, prefs)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint)
       DO UPDATE SET user_id = $1, p256dh = $3, auth = $4,
                     prefs = CASE WHEN $6 THEN $5::jsonb ELSE push_subscriptions.prefs END`,
      [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, JSON.stringify(normalizePrefs(prefs)), prefs !== undefined]
    );
  }

  public async updatePrefs(userId: number, endpoint: string, prefs: PushPrefs): Promise<boolean> {
    const { rowCount } = await query(
      'UPDATE push_subscriptions SET prefs = $3 WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint, JSON.stringify(normalizePrefs(prefs))]
    );
    return (rowCount ?? 0) > 0;
  }

  public async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
  }

  /** Envia para as inscrições do usuário com `kind` ligado. Nunca lança: push é bônus do job. */
  public async notify(userId: number, kind: PushKind, payload: PushPayload): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      this.setup();
      const { rows } = await query<SubRow>(
        'SELECT endpoint, p256dh, auth, prefs FROM push_subscriptions WHERE user_id = $1',
        [userId]
      );
      const targets = rows.filter(r => normalizePrefs(r.prefs)[kind]);
      await Promise.all(targets.map(r => this.deliver(r, payload)));
    } catch (e) {
      logger.error(`[Push] Falha ao notificar (${kind}):`, e);
    }
  }

  private async deliver(row: SubRow, payload: PushPayload): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify(payload)
      );
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status !== undefined && GONE.includes(status)) {
        await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]).catch(() => undefined);
        logger.info('[Push] Inscrição expirada removida.');
      } else {
        logger.warn('[Push] Entrega falhou', { status, erro: String(e) });
      }
    }
  }
}

export const pushService = new PushService();
