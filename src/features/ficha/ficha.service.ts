import { query } from '../../config/database';
import { getBrasiliaDateString, getBrasiliaDayName } from '../../utils/time';
import { habitsService } from '../../services/habits.service';
import { workoutService } from '../../services/workout.service';
import { logger } from '../../utils/logger';
import { DatabaseError, toError } from '../../utils/errors';
import { buildFicha, getPlanForDay } from './generator';
import type { Ficha } from './types';

export const LOAD_MIN_KG = 0;
export const LOAD_MAX_KG = 300;

export class FichaService {
  /** Cargas salvas do usuário, por chave de exercício. Falha de banco degrada para o padrão do catálogo. */
  public async getLoads(userId: number): Promise<Map<string, number>> {
    try {
      const { rows } = await query(
        'SELECT exercise_key, load_kg FROM exercise_loads WHERE user_id = $1',
        [userId]
      );
      return new Map(rows.map((r: any) => [r.exercise_key, Number(r.load_kg)]));
    } catch (e) {
      logger.error('Erro ao ler cargas:', new DatabaseError(toError(e).message));
      return new Map();
    }
  }

  /**
   * Aplica o delta e devolve a carga final já limitada. A soma acontece no Postgres
   * (`exercise_loads.load_kg + $delta`), não em memória: dois toques rápidos em `+2,5`
   * viram +5 kg, e não um incremento perdido por leitura defasada. `cargaAtual` só serve
   * de semente quando ainda não existe linha para o exercício.
   */
  public async adjustLoad(userId: number, exerciseKey: string, cargaAtual: number, deltaKg: number): Promise<number> {
    const clampLocal = Math.min(LOAD_MAX_KG, Math.max(LOAD_MIN_KG, cargaAtual + deltaKg));
    try {
      const { rows } = await query(
        `INSERT INTO exercise_loads (user_id, exercise_key, load_kg, updated_at)
         VALUES ($1, $2, LEAST($5::numeric, GREATEST($4::numeric, $3::numeric + $6::numeric)), NOW())
         ON CONFLICT (user_id, exercise_key)
         DO UPDATE SET
           load_kg = LEAST($5::numeric, GREATEST($4::numeric, exercise_loads.load_kg + $6::numeric)),
           updated_at = NOW()
         RETURNING load_kg`,
        [userId, exerciseKey, cargaAtual, LOAD_MIN_KG, LOAD_MAX_KG, deltaKg]
      );
      const final = Number(rows[0].load_kg);
      logger.info(`⚖️ Carga ajustada: user=${userId} ${exerciseKey} ${deltaKg > 0 ? '+' : ''}${deltaKg}kg -> ${final}kg`);
      return final;
    } catch (e) {
      logger.error('Erro ao salvar carga:', new DatabaseError(toError(e).message));
      return clampLocal;
    }
  }

  /** Ficha de hoje já resolvida com as cargas do usuário. `null` em dia sem treino previsto. */
  public async buildToday(userId: number): Promise<Ficha | null> {
    const plan = getPlanForDay(getBrasiliaDayName());
    if (!plan) return null;
    return buildFicha(plan, await this.getLoads(userId), getBrasiliaDateString());
  }

  /** Guarda a ficha entregue no dia para o histórico e para o relatório saber o que foi prescrito. */
  public async saveSession(userId: number, ficha: Ficha): Promise<void> {
    try {
      await query(
        `INSERT INTO ficha_sessions (user_id, brasilia_date, plan_key, payload)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, brasilia_date)
         DO UPDATE SET plan_key = EXCLUDED.plan_key, payload = EXCLUDED.payload`,
        [userId, ficha.data, ficha.planKey, JSON.stringify(ficha)]
      );
    } catch (e) {
      logger.error('Erro ao salvar sessão da ficha:', new DatabaseError(toError(e).message));
    }
  }

  /**
   * Fecha o treino do dia. Escreve nas tabelas que o Queima Buchinho já usa
   * (`workout_logs` e `daily_habits`) para streak, /relatorio e dashboard continuarem
   * corretos, e marca a sessão da ficha como concluída.
   */
  public async completeToday(userId: number): Promise<void> {
    const today = getBrasiliaDateString();
    await workoutService.logWorkout(userId, true, 'Ficha de treino');
    await habitsService.markHabit(userId, 'treino', true);
    try {
      await query(
        `UPDATE ficha_sessions SET completed = TRUE, completed_at = NOW()
         WHERE user_id = $1 AND brasilia_date = $2`,
        [userId, today]
      );
    } catch (e) {
      logger.error('Erro ao concluir sessão da ficha:', new DatabaseError(toError(e).message));
    }
  }

  /** Cárdio da ficha: mesmo hábito `cardio` que o menu diário já registra. */
  public async completeCardio(userId: number): Promise<void> {
    const today = getBrasiliaDateString();
    await habitsService.markHabit(userId, 'cardio', true);
    try {
      await query(
        `UPDATE ficha_sessions SET cardio_done = TRUE
         WHERE user_id = $1 AND brasilia_date = $2`,
        [userId, today]
      );
    } catch (e) {
      logger.error('Erro ao registrar cárdio da ficha:', new DatabaseError(toError(e).message));
    }
  }
}

export const fichaService = new FichaService();
