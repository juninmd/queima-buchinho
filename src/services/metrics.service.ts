import { pool } from '../config/database';
import { getBrasiliaDateString } from '../utils/time';
import { logger } from '../utils/logger';

export type MetricType = 'water' | 'weight' | 'steps' | 'sleep' | 'height' | 'muscle_mass' | 'body_fat';

export class MetricsService {
    public async logMetric(userId: number, type: MetricType, value: number, unit?: string): Promise<void> {
        try {
            const today = getBrasiliaDateString();
            await pool.query(
                `INSERT INTO user_metrics (user_id, type, value, unit, brasilia_date)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, type, value, unit ?? null, today]
            );
            logger.info(`📊 Métrica registrada: user=${userId} tipo=${type} valor=${value}${unit ?? ''}`);
        } catch (error) {
            logger.error('Erro ao salvar métrica:', error);
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
            logger.error(`Erro ao buscar soma de ${type}:`, error);
            return 0;
        }
    }

    public async getLatestValue(userId: number, type: MetricType): Promise<number | null> {
        try {
            const { rows } = await pool.query(
                `SELECT value FROM user_metrics 
                 WHERE user_id = $1 AND type = $2 
                 ORDER BY created_at DESC LIMIT 1`,
                [userId, type]
            );
            return rows[0] ? parseFloat(rows[0].value) : null;
        } catch (error) {
            logger.error(`Erro ao buscar último valor de ${type}:`, error);
            return null;
        }
    }

    public async getDailySummary(userId: number): Promise<any> {
        try {
            const today = getBrasiliaDateString();
            const { rows } = await pool.query(
                `SELECT type, SUM(value) as total 
                 FROM user_metrics 
                 WHERE user_id = $1 AND brasilia_date = $2
                 GROUP BY type`,
                [userId, today]
            );
            
            const metrics: any = {};
            rows.forEach(r => metrics[r.type] = parseFloat(r.total));
            
            // Buscar últimos valores de medidas (que não mudam todo dia)
            const [height, muscle, fat] = await Promise.all([
                this.getLatestValue(userId, 'height'),
                this.getLatestValue(userId, 'muscle_mass'),
                this.getLatestValue(userId, 'body_fat')
            ]);

            return {
                water: metrics.water || 0,
                weight: metrics.weight || null,
                height,
                muscle_mass: muscle,
                body_fat: fat
            };
        } catch (error) {
            logger.error('Erro ao gerar resumo diário:', error);
            return null;
        }
    }

    public async getLastWeight(userId: number): Promise<number | null> {
        return this.getLatestValue(userId, 'weight');
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
            logger.error('Erro ao calcular diferença de peso:', error);
            return 0;
        }
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
            logger.error('Erro ao gerar resumo semanal:', error);
            return null;
        }
    }
}

export const metricsService = new MetricsService();
