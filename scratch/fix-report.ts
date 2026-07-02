import { readFileSync } from 'fs';
import { Client } from 'pg';
import { HABITS, getProgressBar } from '../src/config/habits';
import { getBrasiliaDateString } from '../src/utils/time';
import { WATER_GOAL_ML } from '../src/config/constants';

// Carrega DATABASE_URL do .env sem depender de framework.
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const today = getBrasiliaDateString();
const groupId = Number(process.env.CHAT_ID);

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// 1. Quem tem dados de hoje (qualquer tabela)?
const owners = await c.query(
  `SELECT user_id, count(*) FROM daily_habits WHERE brasilia_date::text=$1 AND completed=true GROUP BY user_id
   UNION ALL SELECT user_id, count(*) FROM user_metrics WHERE brasilia_date::text=$1 GROUP BY user_id
   UNION ALL SELECT user_id, count(*) FROM workout_logs WHERE brasilia_date::text=$1 AND trained=true GROUP BY user_id`,
  [today]
);
const ids = [...new Set(owners.rows.map(r => Number(r.user_id)))];
console.log(`Data (${today}). CHAT_ID(grupo)=${groupId}. user_ids com dados hoje:`, ids);

for (const uid of ids) {
  const { rows: hrows } = await c.query(
    `SELECT habit_key FROM daily_habits WHERE user_id=$1 AND brasilia_date::text=$2 AND completed=true`, [uid, today]);
  const done = new Set(hrows.map(r => r.habit_key));
  const { rows: wrows } = await c.query(
    `SELECT COALESCE(SUM(value),0) total FROM user_metrics WHERE user_id=$1 AND type='water' AND brasilia_date::text=$2`, [uid, today]);
  const water = parseFloat(wrows[0].total) || 0;
  const { rows: trows } = await c.query(
    `SELECT 1 FROM workout_logs WHERE user_id=$1 AND brasilia_date::text=$2 AND trained=true LIMIT 1`, [uid, today]);
  const treino = done.has('treino') || trows.length > 0;
  done.add(treino ? 'treino' : '__none__');
  const completed = HABITS.filter(h => h.key === 'treino' ? treino : done.has(h.key)).length;
  const total = HABITS.length;
  const waterRatio = Math.min(water / WATER_GOAL_ML, 1);
  const nota = Math.max(1, Math.min(10, Math.round((completed / total) * 6 + (treino ? 2 : 0) + waterRatio * 2)));

  let msg = `\n===== RELATÓRIO CORRIGIDO — user_id=${uid} =====\n`;
  for (const h of HABITS) {
    const ok = h.key === 'treino' ? treino : done.has(h.key);
    msg += `${ok ? '✅' : '⬜'} ${h.emoji} ${h.label}\n`;
  }
  msg += `📊 Hábitos: ${completed}/${total}  ${getProgressBar(completed, total)}\n`;
  msg += `💧 Água: ${water}ml / ${WATER_GOAL_ML}ml\n`;
  msg += `💪 Treino: ${treino ? 'Feito ✅' : '❌'}   🏃 Cárdio: ${done.has('cardio') ? 'Feito ✅' : '❌'}\n`;
  msg += `Nota: ${nota}/10`;
  console.log(msg);
}

await c.end();
