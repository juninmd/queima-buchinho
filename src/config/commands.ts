import TelegramBot from 'node-telegram-bot-api';
import type { BotCommand } from 'node-telegram-bot-api';
import { logger } from '../utils/logger';

/** Lista exibida ao digitar "/" no Telegram. Ordem = relevância no uso diário. */
export const BOT_COMMANDS: BotCommand[] = [
  { command: 'menu', description: 'Menu do dia: hábitos, água e treino' },
  { command: 'ficha', description: 'Ficha de treino de hoje' },
  { command: 'agua', description: 'Registrar água' },
  { command: 'peso', description: 'Registrar peso (ex.: /peso 82,5)' },
  { command: 'cardapio', description: 'Cardápio de hoje' },
  { command: 'relatorio', description: 'Relatório do dia com a Mika' },
  { command: 'semana', description: 'Resumo da semana' },
  { command: 'streak', description: 'Sequência de treinos' },
  { command: 'pausar', description: 'Pausar lembretes (ex.: /pausar 3)' },
  { command: 'voltar', description: 'Retomar lembretes' },
  { command: 'passos', description: 'Registrar passos (ex.: /passos 8000)' },
  { command: 'altura', description: 'Registrar altura em cm' },
  { command: 'gordura', description: 'Registrar % de gordura' },
  { command: 'musculo', description: 'Registrar % de massa muscular' },
  { command: 'checktreino', description: 'Verificar treino de hoje' },
  { command: 'cardio', description: 'Como registrar cárdio' },
  { command: 'reset', description: 'Resetar treino de hoje' },
  { command: 'motivar', description: 'Áudio motivacional' },
  { command: 'meme', description: 'Meme aleatório ou por termo' },
  { command: 'gif', description: 'GIF por termo' },
  { command: 'sticker', description: 'Sticker aleatório ou por termo' },
  { command: 'instante', description: 'Som do MyInstants' },
  { command: 'cantada', description: 'Cantada da Mika' },
  { command: 'hora', description: 'Horário de Brasília' },
  { command: 'help', description: 'Ajuda' },
];

/** Falha aqui só tira o autocomplete; o bot segue funcionando. */
export async function registerBotCommands(bot: TelegramBot): Promise<void> {
  try {
    await bot.setMyCommands(BOT_COMMANDS);
    logger.info(`📋 ${BOT_COMMANDS.length} comandos registrados no Telegram.`);
  } catch (e) {
    logger.error('⚠️ Falha ao registrar comandos no Telegram:', e);
  }
}
