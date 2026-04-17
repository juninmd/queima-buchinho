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
    logger.info('⚙️ Iniciando setup do Bot...');
    
    const allowedUpdates = ['message', 'callback_query', 'channel_post', 'edited_message'];

    if (webhookUrl) {
      bot = new TelegramBot(token, { webHook: { port } } as any);
      await bot.deleteWebHook();
      await bot.setWebHook(`${webhookUrl}/bot${token}`, { allowed_updates: allowedUpdates } as any);
      logger.info(`🚀 Modo WEBHOOK ativo: ${webhookUrl}`);
    } else {
      bot = new TelegramBot(token);
      await bot.deleteWebHook();
      bot.startPolling({ polling: { interval: 1000, params: { allowed_updates: allowedUpdates } } } as any);
      logger.info('🚀 Modo POLLING ativo (intervalo 1s)');
    }
    
    // LOG EXTREMO: Capturar qualquer evento
    bot.on('message', (msg) => {
      logger.info(`📩 [DEBUG] MENSAGEM RECEBIDA: Chat=${msg.chat.id}, User=${msg.from?.username}, Texto="${msg.text}"`);
    });
    
    bot.on('callback_query', (query) => {
      logger.info(`🖱️ [DEBUG] CALLBACK RECEBIDO: Data=${query.data}, Chat=${query.message?.chat.id}`);
    });

    bot.on('polling_error', (err) => logger.error('❌ [DEBUG] Erro no Polling:', err.message));

    const menu = new MenuController(bot);
    new HabitsController(bot, menu).init();
    new BotController(bot).init();
    menu.init();
    logger.info('✅ Todos os controllers inicializados!');
  };
  setupBot().catch(err => logger.error('💥 Erro fatal no setupBot:', err));
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
      logger.error(`❌ Erro no modo agendado ${mode}:`, error);
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
  else if (m === 'daily_audit') await scheduler.runDailyMikaAudit();
  else if (m.startsWith('food_')) await scheduler.sendFoodReminder(m.replace('food_', '') as any);
}
