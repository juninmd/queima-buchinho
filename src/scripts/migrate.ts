import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

const migrationQuery = `
  CREATE TABLE IF NOT EXISTS workout_logs (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    brasilia_date DATE NOT NULL,
    trained BOOLEAN NOT NULL,
    user_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, brasilia_date)
  );

  CREATE TABLE IF NOT EXISTS user_metrics (
    id SERIAL PRIMARY KEY,
    user_id BIGINT,
    type VARCHAR(50),
    value NUMERIC,
    unit VARCHAR(20),
    brasilia_date VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_user_metrics_date
    ON user_metrics (user_id, brasilia_date, type);

  CREATE TABLE IF NOT EXISTS daily_habits (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    brasilia_date DATE NOT NULL,
    habit_key VARCHAR(50) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, brasilia_date, habit_key)
  );

  CREATE INDEX IF NOT EXISTS idx_daily_habits_lookup
    ON daily_habits (user_id, brasilia_date);
`;

async function migrate() {
  logger.info('🚀 Iniciando migração do banco de dados...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migrationQuery);
    await client.query('COMMIT');
    logger.info('✅ Migração finalizada com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Erro durante a migração:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  logger.error('💥 Erro fatal na migração:', err);
  process.exit(1);
});
