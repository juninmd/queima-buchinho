import { METRIC_LIMITS } from '../../config/constants';
import { metricsService, MetricType } from '../../services/metrics.service';
import { redisService } from '../../services/redis.service';
import { parseQuickLog } from '../../features/quick-log/parser';
import { formatDecimalBR } from '../../utils/number';
import { HttpError } from '../http';
import { asObject, parseId, reqNumber, reqString } from '../validate';
import type { Router } from '../router';

const TYPES: MetricType[] = ['water', 'weight', 'steps', 'height', 'body_fat', 'muscle_mass'];
const IDEMPOTENCY_TTL_S = 86400;

export interface SavedMetric { id: number; total?: number }

/** Valida faixa, grava e devolve o id (usado no desfazer) + o total de água do dia. */
export async function saveMetric(userId: number, type: MetricType, value: number): Promise<SavedMetric> {
  const limits = METRIC_LIMITS[type as keyof typeof METRIC_LIMITS];
  if (!limits || value < limits.min || value > limits.max) throw new HttpError(400, 'invalid_value');
  if (type === 'steps' && !Number.isInteger(value)) throw new HttpError(400, 'invalid_value');

  const id = await metricsService.logMetric(userId, type, value, limits.unit);
  if (id === null) throw new HttpError(500, 'internal_error');
  return type === 'water' ? { id, total: await metricsService.getTodaySum(userId, 'water') } : { id };
}

/** Repetir a mesma chave devolve a resposta original em vez de gravar de novo (fila offline do app). */
async function withIdempotency<T>(userId: number, key: string | undefined, run: () => Promise<T>): Promise<T> {
  if (!key || key.length > 100) return run();
  const cacheKey = `idem:${userId}:${key}`;
  const cached = await redisService.get(cacheKey).catch(() => null);
  if (cached) {
    try { return JSON.parse(cached) as T; } catch { /* regrava */ }
  }
  const result = await run();
  await redisService.set(cacheKey, JSON.stringify(result), IDEMPOTENCY_TTL_S).catch(() => undefined);
  return result;
}

export function metricsRoutes(router: Router): void {
  router
    .add('POST', '/api/metrics', async ({ userId, req, body }) => {
      const data = asObject(await body());
      const type = data.type;
      if (typeof type !== 'string' || !TYPES.includes(type as MetricType)) throw new HttpError(400, 'invalid_type');
      const value = reqNumber(data, 'value');
      const key = req.headers['idempotency-key'];
      return withIdempotency(userId, Array.isArray(key) ? key[0] : key, () => saveMetric(userId, type as MetricType, value));
    })
    .add('DELETE', '/api/metrics/:id', async ({ userId, params }) => ({
      deleted: await metricsService.deleteMetric(userId, parseId(params.id)),
    }))
    .add('POST', '/api/quick-log', async ({ userId, body }) => {
      const parsed = parseQuickLog(reqString(asObject(await body()), 'text'));
      if (!parsed) return { kind: 'none' };
      if (parsed.kind === 'workout' || parsed.kind === 'cardio') return { kind: parsed.kind, needsConfirm: true };
      if (parsed.kind === 'water') {
        const saved = await saveMetric(userId, 'water', parsed.ml);
        const total = (saved.total ?? 0).toLocaleString('pt-BR');
        return { kind: 'water', id: saved.id, message: `💧 +${parsed.ml.toLocaleString('pt-BR')}ml registrado. Total hoje: ${total}ml` };
      }
      const saved = await saveMetric(userId, 'weight', parsed.kg);
      return { kind: 'weight', id: saved.id, message: `⚖️ Peso ${formatDecimalBR(parsed.kg)} kg registrado.` };
    });
}
