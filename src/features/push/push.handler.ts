import TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { logger } from '../../utils/logger';
import { deviceRepo } from './device.repo';
import { pushService } from './push.service';

/** /app: link do app e teste de notificação nos aparelhos já registrados (Telegram ⇄ app). */
export async function handleApp(bot: TelegramBot, msg: Message): Promise<void> {
  const userId = msg.from?.id || msg.sender_chat?.id;
  if (!userId) return;
  try {
    const url = process.env.APP_URL;
    const devices = pushService.isNativeEnabled() ? await deviceRepo.list(userId) : [];
    const lines = [
      '📱 <b>App Queima Buchinho</b>',
      url ? `Abra: ${url}` : 'Defina APP_URL no servidor para eu mandar o link.',
      devices.length
        ? `🔔 ${devices.length} aparelho(s) com notificações nativas. Mandei um teste agora.`
        : '🔔 Nenhum aparelho com notificação nativa. No app: Ajustes › Lembretes.',
    ];
    await bot.sendMessage(msg.chat.id, lines.join('\n'), { parse_mode: 'HTML' });
    if (devices.length) {
      await pushService.notify(userId, 'fechamento', {
        title: '🔔 Teste da Mika', body: 'Notificação nativa funcionando.', tag: 'teste', url: '/#hoje',
      });
    }
  } catch (e) {
    logger.error('[App] Erro no /app:', e);
    await bot.sendMessage(msg.chat.id, '❌ Não consegui agora. Tenta de novo em instantes.');
  }
}
