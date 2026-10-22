import { query } from '../../config/database';
import { normalizePrefs } from './push.types';
import type { DevicePlatform, PushPrefs } from './push.types';

export interface DeviceRow { token: string; platform: DevicePlatform; prefs: unknown }

/** Tokens FCM do app nativo (tabela device_tokens). */
export const deviceRepo = {
  async save(userId: number, token: string, platform: DevicePlatform, prefs?: unknown): Promise<void> {
    await query(
      `INSERT INTO device_tokens (user_id, token, platform, prefs) VALUES ($1, $2, $3, $4)
       ON CONFLICT (token)
       DO UPDATE SET user_id = $1, platform = $3,
                     prefs = CASE WHEN $5 THEN $4::jsonb ELSE device_tokens.prefs END`,
      [userId, token, platform, JSON.stringify(normalizePrefs(prefs)), prefs !== undefined]
    );
  },

  async updatePrefs(userId: number, token: string, prefs: PushPrefs): Promise<boolean> {
    const { rowCount } = await query(
      'UPDATE device_tokens SET prefs = $3 WHERE user_id = $1 AND token = $2',
      [userId, token, JSON.stringify(normalizePrefs(prefs))]
    );
    return (rowCount ?? 0) > 0;
  },

  async remove(userId: number, token: string): Promise<void> {
    await query('DELETE FROM device_tokens WHERE user_id = $1 AND token = $2', [userId, token]);
  },

  async purge(token: string): Promise<void> {
    await query('DELETE FROM device_tokens WHERE token = $1', [token]);
  },

  async list(userId: number): Promise<DeviceRow[]> {
    const { rows } = await query<DeviceRow>('SELECT token, platform, prefs FROM device_tokens WHERE user_id = $1', [userId]);
    return rows;
  },
};
