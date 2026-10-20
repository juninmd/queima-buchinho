import type { MetricType } from '../api/contract';

/** Espelha METRIC_LIMITS do bot (src/config/constants.ts) para validar antes de enviar. */
export const METRIC_LIMITS: Record<MetricType, { min: number; max: number; unit: string }> = {
  weight: { min: 20, max: 400, unit: 'kg' },
  height: { min: 50, max: 250, unit: 'cm' },
  body_fat: { min: 1, max: 70, unit: '%' },
  muscle_mass: { min: 1, max: 70, unit: '%' },
  steps: { min: 0, max: 100000, unit: 'passos' },
  water: { min: 50, max: 5000, unit: 'ml' },
};
