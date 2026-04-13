import * as dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * Escapes regex characters in a string.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Masks the Telegram token in any string or object.
 */
export function maskData(data: any): any {
  if (!TOKEN || TOKEN.length < 5) return data;

  const tokenRegex = new RegExp(escapeRegExp(TOKEN), 'g');

  if (typeof data === 'string') {
    return data.replace(tokenRegex, '***[TOKEN_OCULTO]***');
  }

  if (typeof data === 'object' && data !== null) {
    try {
        const json = JSON.stringify(data);
        if (json.includes(TOKEN)) {
          return JSON.parse(json.replace(tokenRegex, '***[TOKEN_OCULTO]***'));
        }
    } catch (e) {
        // If circular structure or other JSON error, return as is (safest path for non-serializable objects)
        return '[Unserializable Object - Masking Skipped]';
    }
  }

  return data;
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(maskData(message), ...args.map(maskData));
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(maskData(message), ...args.map(maskData));
  },
  error: (message: string, ...args: any[]) => {
    console.error(maskData(message), ...args.map(maskData));
  }
};
