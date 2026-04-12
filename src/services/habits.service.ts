import { pool } from '../config/database';
import { redisService } from './redis.service';
import { getBrasiliaDateString } from '../utils/time';
import { HABITS } from '../config/habits';

const CACHE_TTL = 86400;

export interface HabitStatus {
  [key: string]: boolean;
}

export class HabitsService {
  private cacheKey(userId: number, date: string): string {
    return `habits:${userId}:${date}`;
  }

  public async getStatus(userId: number): Promise<HabitStatus> {
    const today = getBrasiliaDateString();
    const cached = await redisService.get(this.cacheKey(userId, today));
    if (cached) return JSON.parse(cached);

    try {
      const { rows } = await pool.query(
        `SELECT habit_key, completed FROM daily_habits
         WHERE user_id = $1 AND brasilia_date = $2`,
        [userId, today]
      );

      const status: HabitStatus = {};
      HABITS.forEach(h => status[h.key] = false);
      rows.forEach((r: any) => { if (r.completed) status[r.habit_key] = true; });

      await redisService.set(this.cacheKey(userId, today), JSON.stringify(status), CACHE_TTL);
      return status;
    } catch (error) {
      console.error('Erro ao buscar status dos hábitos:', error);
      const status: HabitStatus = {};
      HABITS.forEach(h => status[h.key] = false);
      return status;
    }
  }

  public async toggleHabit(userId: number, habitKey: string): Promise<boolean> {
    const today = getBrasiliaDateString();
    const current = await this.getStatus(userId);
    const newValue = !current[habitKey];

    try {
      await pool.query(
        `INSERT INTO daily_habits (user_id, brasilia_date, habit_key, completed, completed_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, brasilia_date, habit_key)
         DO UPDATE SET completed = $4, completed_at = $5`,
        [userId, today, habitKey, newValue, newValue ? new Date() : null]
      );
      console.log(`📋 Hábito ${habitKey} = ${newValue} user=${userId}`);
    } catch (error) {
      console.error(`Erro ao alternar hábito ${habitKey}:`, error);
    }

    await redisService.del(this.cacheKey(userId, today));
    return newValue;
  }

  public async markHabit(userId: number, habitKey: string, completed: boolean): Promise<void> {
    const today = getBrasiliaDateString();
    try {
      await pool.query(
        `INSERT INTO daily_habits (user_id, brasilia_date, habit_key, completed, completed_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, brasilia_date, habit_key)
         DO UPDATE SET completed = $4, completed_at = $5`,
        [userId, today, habitKey, completed, completed ? new Date() : null]
      );
    } catch (error) {
      console.error(`Erro ao marcar hábito ${habitKey}:`, error);
    }
    await redisService.del(this.cacheKey(userId, today));
  }

  public async getCompletedCount(userId: number): Promise<{ completed: number; total: number }> {
    const status = await this.getStatus(userId);
    const completed = Object.values(status).filter(Boolean).length;
    return { completed, total: HABITS.length };
  }

  public async getUncompletedHabits(userId: number): Promise<string[]> {
    const status = await this.getStatus(userId);
    return HABITS.filter(h => !status[h.key]).map(h => h.key);
  }
}

export const habitsService = new HabitsService();
