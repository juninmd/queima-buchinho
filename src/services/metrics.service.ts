import { Pool } from 'pg';
import { getBrasiliaDateString } from '../utils/time';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type MetricType = 'water' | 'weight' | 'steps' | 'sleep';

export class MetricsService {
    public async logMetric(userId: number, type: MetricType, value: number, unit?: string): Promise<void> {
        try {
            const today = getBrasiliaDateString();
            await pool.query(
                `INSERT INTO user_metrics (user_id, type, value, unit, brasilia_date)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, type, value, unit ?? null, today]
            );
            console.log(`📊 Métrica registrada: user=${userId} tipo=${type} valor=${value}${unit ?? ''}`);
        } catch (error) {
            console.error('Erro ao salvar métrica:', error);
        }
    }

    public async getTodaySum(userId: number, type: MetricType): Promise<number> {
        try {
            const today = getBrasiliaDateString();
            const { rows } = await pool.query(
                `SELECT SUM(value) as total 
                 FROM user_metrics 
                 WHERE user_id = $1 AND type = $2 AND brasilia_date = $3`,
                [userId, type, today]
            );
            return parseFloat(rows[0].total) || 0;
        } catch (error) {
            console.error(`Erro ao buscar soma de ${type}:`, error);
            return 0;
        }
    }

    public async getLastWeight(userId: number): Promise<number | null> {
        try {
            const { rows } = await pool.query(
                `SELECT value FROM user_metrics 
                 WHERE user_id = $1 AND type = 'weight' 
                 ORDER BY created_at DESC LIMIT 1`,
                [userId]
            );
            return rows[0] ? parseFloat(rows[0].value) : null;
        } catch (error) {
            console.error('Erro ao buscar último peso:', error);
            return null;
        }
    }

    public async getWeightDiffFromStart(userId: number): Promise<number> {
        try {
            const { rows } = await pool.query(
                `SELECT value FROM user_metrics 
                 WHERE user_id = $1 AND type = 'weight' 
                 ORDER BY created_at ASC`,
                [userId]
            );
            if (rows.length < 2) return 0;
            const firstWeight = parseFloat(rows[0].value);
            const lastWeight = parseFloat(rows[rows.length - 1].value);
            return lastWeight - firstWeight;
        } catch (error) {
            console.error('Erro ao calcular diferença de peso:', error);
            return 0;
        }
    public async getWeeklySummary(userId: number): Promise<any> {
        try {
            const queries = {
                currentMetrics: `
                    SELECT type, SUM(value) as total 
                    FROM user_metrics 
                    WHERE user_id = $1 AND CAST(brasilia_date AS DATE) >= date_trunc('week', CURRENT_DATE)
                    GROUP BY type`,
                previousMetrics: `
                    SELECT type, SUM(value) as total 
                    FROM user_metrics 
                    WHERE user_id = $1 
                      AND CAST(brasilia_date AS DATE) >= date_trunc('week', CURRENT_DATE - INTERVAL '1 week')
                      AND CAST(brasilia_date AS DATE) < date_trunc('week', CURRENT_DATE)
                    GROUP BY type`,
                currentWorkouts: `
                    SELECT COUNT(*) as total 
                    FROM workout_logs 
                    WHERE user_id = $1 AND trained = true AND CAST(brasilia_date AS DATE) >= date_trunc('week', CURRENT_DATE)`,
                previousWorkouts: `
                    SELECT COUNT(*) as total 
                    FROM workout_logs 
                    WHERE user_id = $1 AND trained = true 
                      AND CAST(brasilia_date AS DATE) >= date_trunc('week', CURRENT_DATE - INTERVAL '1 week')
                      AND CAST(brasilia_date AS DATE) < date_trunc('week', CURRENT_DATE)`
            };

            const [currMet, prevMet, currWork, prevWork] = await Promise.all([
                pool.query(queries.currentMetrics, [userId]),
                pool.query(queries.previousMetrics, [userId]),
                pool.query(queries.currentWorkouts, [userId]),
                pool.query(queries.previousWorkouts, [userId])
            ]);

            const mapMetrics = (rows: any[]) => {
                const map: any = { water: 0, weight: 0 };
                rows.forEach(r => map[r.type] = parseFloat(r.total));
                return map;
            };

            return {
                current: {
                    metrics: mapMetrics(currMet.rows),
                    workouts: parseInt(currWork.rows[0].total) || 0
                },
                previous: {
                    metrics: mapMetrics(prevMet.rows),
                    workouts: parseInt(prevWork.rows[0].total) || 0
                }
            };
        } catch (error) {
            console.error('Erro ao gerar resumo semanal:', error);
            return null;
        }
    }
}

export const metricsService = new MetricsService();
