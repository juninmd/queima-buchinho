import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { SchedulerService } from './services/scheduler.service';
import { BotController } from './controllers/bot.controller';
import { MenuController } from './controllers/menu.controller';
import { HabitsController } from './controllers/habits.controller';
import { redisService } from './services/redis.service';
import { logger } from './utils/logger';
import { HealthServer } from './utils/server';
import { pool } from './config/database';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const mode = process.env.BOT_MODE || 'listener';
const webhookUrl = process.env.WEBHOOK_URL;
const port = Number(process.env.PORT) || 3000;
const healthPort = Number(process.env.HEALTH_PORT) || 8080;

if (!token) throw new Error('TELEGRAM_BOT_TOKEN não definido');

const healthServer = new HealthServer(healthPort);
healthServer.start();

let bot: TelegramBot;

async function shutdown(signal: string) {
  logger.info(`🛑 Recebido ${signal}. Shutdown gracioso...`);
  await healthServer.close();
  await redisService.disconnect();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (mode === 'listener') {
  redisService.connect();
  if (webhookUrl) {
    bot = new TelegramBot(token, { webHook: { port, path: `/bot${token}` } } as any);
    const setupWebhook = async () => {
      try {
        await bot.deleteWebHook();
        await bot.setWebHook(`${webhookUrl}/bot${token}`, {
          allowed_updates: ['message', 'channel_post', 'callback_query']
        });
        await bot.setMyCommands([
          { command: 'menu', description: '🔥 Menu de hábitos' },
          { command: 'progresso', description: '📊 Ver progresso' },
          { command: 'agua', description: '💧 Registrar água' },
          { command: 'peso', description: '⚖️ Registrar peso' },
          { command: 'semana', description: ' Resumo semanal' },
          { command: 'instante', description: '🎶 MyInstants' },
          { command: 'motivar', description: '🔥 Motivação' },
          { command: 'status', description: 'ℹ️ Status do bot' },
          { command: 'help', description: '❓ Ajuda' }
        ]);
        logger.info(`🚀 Webhook ativo na porta ${port}`);
      } catch (err) {
        logger.error('❌ Erro no Webhook:', err);
      }
    };
    setupWebhook();
  } else {
    bot = new TelegramBot(token);
    bot.deleteWebHook().then(() => {
      bot.startPolling();
      logger.info('🚀 Polling ativo');
    });
  }

  const menu = new MenuController(bot);
  new HabitsController(bot, menu).init();
  new BotController(bot).init();
  menu.init();

  bot.on('message', (msg) => {
    logger.info(`📩 [Telegram] Mensagem recebida! ChatID: ${msg.chat.id}, User: ${msg.from?.first_name}, Texto: "${msg.text || '[SEM TEXTO]'}"`);
  });
} else {
  bot = new TelegramBot(token);
  redisService.connect();
  const scheduler = new SchedulerService(bot);
  
  (async () => {
    try {
      if (mode === 'checker') await scheduler.runDailyCheck();
      else if (mode.startsWith('reminder_')) await runReminder(scheduler, mode);
      process.exit(0);
    } catch (error) {
      logger.error(`❌ Erro no modo ${mode}:`, error);
      process.exit(1);
    }
  })();
}

async function runReminder(scheduler: SchedulerService, mode: string) {
  const m = mode.replace('reminder_', '');
  if (m === 'morning') await scheduler.sendMorningReminder();
  else if (m === 'conditional') await scheduler.sendConditionalReminder();
  else if (m === 'water') await scheduler.sendWaterReminder();
  else if (m === 'habits_check') await scheduler.sendHabitsCheckReminder();
  else if (m.startsWith('food_')) await scheduler.sendFoodReminder(m.replace('food_', '') as any);
}
