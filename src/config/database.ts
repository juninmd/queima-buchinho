import { Pool, QueryConfig, QueryResult } from 'pg';
import { logger } from '../utils/logger';
import { DatabaseError } from '../utils/errors';

if (!process.env.DATABASE_URL) {
  logger.warn('DATABASE_URL não definido — pool criado sem connectionString');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error('Erro inesperado no pool PostgreSQL', err);
});

const SLOW_QUERY_MS = 100;

export async function query<T extends Record<string, any> = Record<string, any>>(
  text: string | QueryConfig,
  values?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text as string, values);
  const duration = Date.now() - start;
  if (duration > SLOW_QUERY_MS) {
    logger.warn('Query lenta detectada', { duration, query: typeof text === 'string' ? text : text.text });
  }
  return result;
}

export { pool };
