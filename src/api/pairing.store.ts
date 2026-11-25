import { createHash, randomBytes } from 'crypto';
import { query } from '../config/database';

/**
 * Pareamento por QR: o QR carrega um código de uso único e curta duração (CODE_TTL_MIN). O app o
 * troca por um token de dispositivo de longa duração (DEVICE_TTL_DAYS), revogável. No banco só
 * vai o hash SHA-256 (os segredos têm 256 bits, então não precisam de KDF lento).
 */
export const CODE_TTL_MIN = 5;
export const DEVICE_TTL_DAYS = 365;
const TOUCH_MS = 5 * 60_000;

/** Link que vai dentro do QR. O app só aceita https (ou localhost, para teste). */
export function pairingLink(baseUrl: string, code: string): string {
  return `queima://pair?v=1&u=${encodeURIComponent(baseUrl.trim().replace(/\/+$/, ''))}&c=${code}`;
}

export interface Device { id: number; name: string; created_at: Date; last_used_at: Date | null; expires_at: Date; revoked_at: Date | null }

const sha = (s: string): string => createHash('sha256').update(s).digest('hex');
const secret = (prefix: string): string => `${prefix}_${randomBytes(32).toString('base64url')}`;

/** Gera um código de pareamento (devolvido uma única vez; só o hash é guardado). */
export async function createPairingCode(): Promise<{ code: string; expiresAt: Date }> {
  const code = secret('qbp');
  const r = await query<{ expires_at: Date }>(
    `INSERT INTO pairing_codes (code_hash, expires_at) VALUES ($1, NOW() + make_interval(mins => $2)) RETURNING expires_at`, [sha(code), CODE_TTL_MIN]);
  await query(`DELETE FROM pairing_codes WHERE expires_at < NOW() - INTERVAL '1 day'`);
  return { code, expiresAt: r.rows[0].expires_at };
}

/** Consome o código (atômico: uma única troca vence) e cria o dispositivo. null = código inválido/expirado/usado. */
export async function redeemPairingCode(code: string, name: string): Promise<{ token: string; id: number; expiresAt: Date } | null> {
  const used = await query(`UPDATE pairing_codes SET used_at = NOW() WHERE code_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING 1`, [sha(code)]);
  if (!used.rowCount) return null;
  const token = secret('qbd');
  const r = await query<{ id: number; expires_at: Date }>(
    `INSERT INTO paired_devices (name, token_hash, expires_at) VALUES ($1, $2, NOW() + make_interval(days => $3)) RETURNING id, expires_at`,
    [name.slice(0, 60), sha(token), DEVICE_TTL_DAYS]);
  return { token, id: r.rows[0].id, expiresAt: r.rows[0].expires_at };
}

/** Token de dispositivo válido (existente, não revogado, não expirado). Falha de banco = recusa. */
export async function verifyDeviceToken(token: string): Promise<boolean> {
  if (!token.startsWith('qbd_')) return false;
  try {
    const r = await query<{ id: number; last_used_at: Date | null }>(
      `SELECT id, last_used_at FROM paired_devices WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`, [sha(token)]);
    const d = r.rows[0];
    if (!d) return false;
    if (!d.last_used_at || Date.now() - new Date(d.last_used_at).getTime() > TOUCH_MS) void query(`UPDATE paired_devices SET last_used_at = NOW() WHERE id = $1`, [d.id]).catch(() => undefined);
    return true;
  } catch { return false; }
}

export async function revokeByToken(token: string): Promise<boolean> {
  const r = await query(`UPDATE paired_devices SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [sha(token)]);
  return !!r.rowCount;
}

export const listDevices = async (): Promise<Device[]> =>
  (await query<Device>(`SELECT id, name, created_at, last_used_at, expires_at, revoked_at FROM paired_devices ORDER BY id`)).rows;

export async function revokeDevice(id: number): Promise<boolean> {
  return !!(await query(`UPDATE paired_devices SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`, [id])).rowCount;
}

export async function revokeAllDevices(): Promise<number> {
  return (await query(`UPDATE paired_devices SET revoked_at = NOW() WHERE revoked_at IS NULL`)).rowCount ?? 0;
}
