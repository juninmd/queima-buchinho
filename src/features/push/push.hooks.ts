import { pushService } from './push.service';
import type { PushKind, PushPayload } from './push.types';

const MEAL_LABEL: Record<string, string> = {
  cafe: 'café da manhã', almoco: 'almoço', cafe_tarde: 'café da tarde', jantar: 'jantar',
};

/** Disparos de push espelhando os lembretes do Telegram. `void`-safe: nada aqui lança. */
const send = (userId: number, kind: PushKind, payload: PushPayload): Promise<void> =>
  pushService.notify(userId, kind, payload);

export const pushFicha = (userId: number, titulo: string): Promise<void> =>
  send(userId, 'ficha', { title: '🏋️ Ficha de hoje', body: `${titulo}. Bora, Mestre.`, tag: 'ficha', url: '/#treino' });

export const pushWater = (userId: number, waterMl: number, goalMl: number): Promise<void> =>
  send(userId, 'agua', {
    title: '💧 Hora da água', body: `${waterMl} ml de ${goalMl} ml. Está abaixo do ritmo do dia.`, tag: 'agua', url: '/#hoje',
  });

export const pushMeal = (userId: number, meal: string): Promise<void> =>
  send(userId, 'refeicao', {
    title: '🍽️ Refeição pendente', body: `Hora do ${MEAL_LABEL[meal] ?? meal}. Já marcou?`, tag: `refeicao-${meal}`, url: '/#habitos',
  });

export const pushClosing = (userId: number, completed: number, total: number, nota: number): Promise<void> =>
  send(userId, 'fechamento', {
    title: '🌙 Fechamento do dia', body: `${completed}/${total} hábitos. Nota ${nota}/10.`, tag: 'fechamento', url: '/#progresso',
  });
