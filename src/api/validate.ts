import { HttpError } from './http';

export type Json = Record<string, unknown>;

export function asObject(body: unknown): Json {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new HttpError(400, 'invalid_body');
  return body as Json;
}

export function reqString(body: Json, key: string, maxLen = 500): string {
  const v = body[key];
  if (typeof v !== 'string' || !v.trim() || v.length > maxLen) throw new HttpError(400, `invalid_${key}`);
  return v.trim();
}

export function reqNumber(body: Json, key: string): number {
  const v = body[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new HttpError(400, `invalid_${key}`);
  return v;
}

export function reqBoolean(body: Json, key: string): boolean {
  const v = body[key];
  if (typeof v !== 'boolean') throw new HttpError(400, `invalid_${key}`);
  return v;
}

/** Id numérico positivo vindo de `:param`. */
export function parseId(raw: string | undefined): number {
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n <= 0) throw new HttpError(400, 'invalid_id');
  return n;
}
