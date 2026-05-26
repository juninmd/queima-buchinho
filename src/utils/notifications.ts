import TelegramBot from 'node-telegram-bot-api';
import { logger } from './logger';

export async function notifyStartup(bot: TelegramBot) {
  const chatId = process.env.CHAT_ID;
  if (!chatId) return;

  const messages = [
    'Eae Mestre! 🤖 Mika online e pronta pra monitorar seu progresso (ou zoar seu sedentarismo). Bora treinar! 💪',
    'Voltei, Majestade! 😈 Sem desculpas hoje. Bebeu água? Foi treinar? Estou de olho!',
    'Mika na área! 🚀 Pronto para dominar o mundo? Começa levantando desse sofá aí kkk.'
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  try {
    await bot.sendMessage(Number(chatId), msg);
  } catch (err: any) {
    logger.error('Erro ao enviar notificação de startup:', err.message);
  }
}

export async function notifyShutdown(bot: TelegramBot) {
  const chatId = process.env.CHAT_ID;
  if (!chatId) return;

  try {
    await bot.sendMessage(Number(chatId), '🛑 Fui! Mas não pense que isso é desculpa para deitar no sofá e fingir que não tem treino hoje, hein!');
  } catch (err: any) {
    logger.error('Erro ao enviar notificação de shutdown:', err.message);
  }
}

export async function notifyCrash(bot: TelegramBot, error: Error) {
  const chatId = process.env.CHAT_ID;
  if (!chatId) return;

  try {
    await bot.sendMessage(Number(chatId), `💥 Eita Mestre, deu algum ruim interno por aqui... Mas relaxa, vou tentar me recompor!\n\nErro: <code>${error.message}</code>`, { parse_mode: 'HTML' });
  } catch (err: any) {
    logger.error('Erro ao enviar notificação de crash:', err.message);
  }
}
