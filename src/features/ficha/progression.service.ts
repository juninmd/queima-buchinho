import { query } from '../../config/database';
import { LOAD_MAX_KG, LOAD_MIN_KG } from '../../config/constants';
import { logger } from '../../utils/logger';
import { DatabaseError, toError } from '../../utils/errors';
import { DELOAD_DAYS, PROGRESSION_STEP_KG } from './progression';
import type { SessionSnapshot } from './progression';

/** Duas semanas de treino seg-sáb cabem em 12 sessões; 14 dá folga para a janela do deload. */
const HISTORY_LIMIT = 14;

export interface BumpedLoad {
  key: string;
  cargaKg: number;
}

export class ProgressionService {
  /**
   * Histórico de sessões CONCLUÍDAS, da mais recente para a mais antiga. Ficha publicada e
   * não treinada não conta: senão o bot promoveria carga por dia passar, não por treino feito.
   */
  public async getHistory(userId: number, limit = HISTORY_LIMIT): Promise<SessionSnapshot[]> {
    try {
      const { rows } = await query(
        `SELECT to_char(brasilia_date, 'YYYY-MM-DD') AS data, payload
           FROM ficha_sessions
          WHERE user_id = $1 AND completed = TRUE
          ORDER BY brasilia_date DESC
          LIMIT $2`,
        [userId, limit]
      );
      return rows.map((r: any) => ({ data: r.data, loads: toLoads(r.payload), deload: !!r.payload?.deload }));
    } catch (e) {
      logger.error('Erro ao ler histórico de sessões:', new DatabaseError(toError(e).message));
      return [];
    }
  }

  /**
   * Sobe todos os exercícios de uma vez. O `cargaAtual` só semeia a linha que ainda não existe
   * (usuário nunca ajustou aquele exercício); quando ela existe, quem soma é o Postgres, pela
   * mesma razão do stepper: dois toques concorrentes não podem virar um incremento só.
   */
  public async bumpLoads(userId: number, itens: BumpedLoad[]): Promise<BumpedLoad[]> {
    if (itens.length === 0) return [];
    try {
      const { rows } = await query(
        `INSERT INTO exercise_loads (user_id, exercise_key, load_kg, updated_at)
         SELECT $1, t.k, LEAST($6::numeric, GREATEST($5::numeric, t.kg + $4::numeric)), NOW()
           FROM unnest($2::text[], $3::numeric[]) AS t(k, kg)
         ON CONFLICT (user_id, exercise_key)
         DO UPDATE SET
           load_kg = LEAST($6::numeric, GREATEST($5::numeric, exercise_loads.load_kg + $4::numeric)),
           updated_at = NOW()
         RETURNING exercise_key, load_kg`,
        [
          userId,
          itens.map(i => i.key),
          itens.map(i => i.cargaKg),
          PROGRESSION_STEP_KG,
          LOAD_MIN_KG,
          LOAD_MAX_KG,
        ]
      );
      logger.info(`⬆️ Progressão aplicada: user=${userId} ${itens.length} exercícios`);
      return rows.map((r: any) => ({ key: r.exercise_key, cargaKg: Number(r.load_kg) }));
    } catch (e) {
      logger.error('Erro ao aplicar progressão:', new DatabaseError(toError(e).message));
      return [];
    }
  }

  /** `true` enquanto a semana leve estiver valendo. Falha de banco não impõe deload. */
  public async isDeloadActive(userId: number, hoje: string): Promise<boolean> {
    try {
      const { rows } = await query(
        `SELECT to_char(deload_until, 'YYYY-MM-DD') AS ate
           FROM training_state WHERE user_id = $1`,
        [userId]
      );
      const ate = rows[0]?.ate;
      return !!ate && ate >= hoje;
    } catch (e) {
      logger.error('Erro ao ler estado de treino:', new DatabaseError(toError(e).message));
      return false;
    }
  }

  /** Liga a semana leve a partir de hoje. Devolve a data final, ou `null` se o banco recusar. */
  public async startDeload(userId: number, hoje: string): Promise<string | null> {
    try {
      const { rows } = await query(
        `INSERT INTO training_state (user_id, deload_until, updated_at)
         VALUES ($1, $2::date + $3::int, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET deload_until = EXCLUDED.deload_until, updated_at = NOW()
         RETURNING to_char(deload_until, 'YYYY-MM-DD') AS ate`,
        [userId, hoje, DELOAD_DAYS]
      );
      logger.info(`😮‍💨 Deload ativado: user=${userId} até ${rows[0]?.ate}`);
      return rows[0]?.ate ?? null;
    } catch (e) {
      logger.error('Erro ao ativar deload:', new DatabaseError(toError(e).message));
      return null;
    }
  }
}

/** O payload é a ficha inteira; para decidir progressão só a carga por exercício importa. */
function toLoads(payload: any): Record<string, number | null> {
  const exercicios = Array.isArray(payload?.exercicios) ? payload.exercicios : [];
  return Object.fromEntries(
    exercicios.map((ex: any) => [String(ex?.key), typeof ex?.cargaKg === 'number' ? ex.cargaKg : null])
  );
}

export const progressionService = new ProgressionService();
