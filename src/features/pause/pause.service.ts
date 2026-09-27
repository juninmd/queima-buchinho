import { query } from '../../config/database';
import { getBrasiliaDateString } from '../../utils/time';

export const MAX_PAUSE_DAYS = 30;
// Janela da busca de pausas para a sequência: evita varrer o histórico inteiro.
const STREAK_LOOKBACK_DAYS = 366;

/** Soma dias a uma data YYYY-MM-DD; meio-dia BRT evita pular dia por fuso/horário de verão. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export class PauseService {
  /** Pausa de hoje até hoje+days-1 (inclusive). Retorna o último dia pausado. */
  public async pause(userId: number, days: number): Promise<string> {
    const start = getBrasiliaDateString();
    const end = addDays(start, days - 1);
    await query('INSERT INTO bot_pauses (user_id, start_date, end_date) VALUES ($1, $2, $3)', [userId, start, end]);
    return end;
  }

  /** Encerra pausas ativas: as iniciadas hoje somem; as em andamento terminam ontem. */
  public async resume(userId: number): Promise<boolean> {
    const today = getBrasiliaDateString();
    const removed = await query('DELETE FROM bot_pauses WHERE user_id = $1 AND start_date >= $2', [userId, today]);
    const ended = await query(
      'UPDATE bot_pauses SET end_date = $2 WHERE user_id = $1 AND start_date < $3 AND end_date >= $3',
      [userId, addDays(today, -1), today]
    );
    return (removed.rowCount ?? 0) + (ended.rowCount ?? 0) > 0;
  }

  /** Último dia da pausa ativa hoje, ou null. */
  public async activeUntil(userId: number): Promise<string | null> {
    const today = getBrasiliaDateString();
    const { rows } = await query<{ until: string | null }>(
      'SELECT MAX(end_date)::text AS until FROM bot_pauses WHERE user_id = $1 AND start_date <= $2 AND end_date >= $2',
      [userId, today]
    );
    return rows[0]?.until ?? null;
  }

  /** Datas pausadas no último ano, para a sequência atravessar pausas sem quebrar. */
  public async pausedDates(userId: number): Promise<Set<string>> {
    const today = getBrasiliaDateString();
    const from = addDays(today, -STREAK_LOOKBACK_DAYS);
    const { rows } = await query<{ start_date: string; end_date: string }>(
      `SELECT start_date::text, end_date::text FROM bot_pauses
       WHERE user_id = $1 AND end_date >= $2 AND start_date <= $3`,
      [userId, from, today]
    );
    const dates = new Set<string>();
    for (const r of rows) {
      let d = r.start_date < from ? from : r.start_date;
      const end = r.end_date > today ? today : r.end_date;
      while (d <= end) { dates.add(d); d = addDays(d, 1); }
    }
    return dates;
  }
}

export const pauseService = new PauseService();
