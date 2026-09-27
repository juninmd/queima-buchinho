import { logger } from '../../utils/logger';
import { pauseService } from './pause.service';

/** Pausa do dono dos dados (USER_ID). Erro de banco não silencia o bot: segue enviando. */
export async function isOwnerPaused(): Promise<boolean> {
  const ownerId = Number(process.env.USER_ID || process.env.CHAT_ID);
  if (!ownerId) return false;
  try {
    return (await pauseService.activeUntil(ownerId)) !== null;
  } catch (e) {
    logger.error('[Pause] Falha ao consultar pausa; job segue normalmente:', e);
    return false;
  }
}

/** Envolve um job agendado para não rodar durante a pausa. */
export const unlessPaused = (name: string, job: () => Promise<unknown>) => async (): Promise<void> => {
  if (await isOwnerPaused()) {
    logger.info(`⏸️ Pausa ativa — job ${name} ignorado.`);
    return;
  }
  await job();
};
