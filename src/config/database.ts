import { Pool } from 'pg';
import { logger } from '../utils/logger';

if (!process.env.DATABASE_URL) {
  logger.error('⚠️ DATABASE_URL não definido — pool será criado sem connectionString');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  logger.error('❌ Erro inesperado no pool PostgreSQL:', err);
});

export { pool };
