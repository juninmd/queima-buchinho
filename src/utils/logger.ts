import * as dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function maskData(data: unknown): unknown {
  if (!TOKEN || TOKEN.length < 5) return data;
  const re = new RegExp(escapeRegExp(TOKEN), 'g');
  if (typeof data === 'string') return data.replace(re, '***[TOKEN_OCULTO]***');
  if (typeof data === 'object' && data !== null) {
    try {
      const json = JSON.stringify(data);
      return json.includes(TOKEN)
        ? JSON.parse(json.replace(re, '***[TOKEN_OCULTO]***'))
        : data;
    } catch {
      return '[Unserializable Object]';
    }
  }
  return data;
}

type Level = 'info' | 'warn' | 'error';

function log(level: Level, message: string, meta?: unknown): void {
  const entry: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    msg: maskData(message),
  };
  if (meta !== undefined) entry['meta'] = maskData(meta);
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};
