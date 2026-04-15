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
  const setupBot = async () => {
    if (webhookUrl) {
      bot = new TelegramBot(token, { webHook: { port } } as any);
      await bot.deleteWebHook({ drop_pending_updates: true });
      await bot.setWebHook(`${webhookUrl}/bot${token}`, {
        allowed_updates: ['message', 'channel_post', 'callback_query']
      });
      logger.info(`🚀 Webhook resetado e ativo: ${webhookUrl}`);
    } else {
      bot = new TelegramBot(token);
      await bot.deleteWebHook({ drop_pending_updates: true });
      bot.startPolling();
      logger.info('🚀 Polling ativo após limpeza de Webhook');
    }
    
    bot.on('message', (msg) => {
      logger.info(`📩 [Telegram] Mensagem: "${msg.text}" do Chat: ${msg.chat.id}`);
    });
    
    const menu = new MenuController(bot);
    new HabitsController(bot, menu).init();
    new BotController(bot).init();
    menu.init();
  };
  setupBot();
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
