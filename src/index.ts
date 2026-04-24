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
      bot = new TelegramBot(token, { 
        polling: { 
          interval: 1000, 
          params: { allowed_updates: allowedUpdates } 
        } 
      } as any);
      await bot.deleteWebHook();
      logger.info(`🚀 Modo POLLING ativo (intervalo 1s). Updates permitidos: ${allowedUpdates.join(', ')}`);

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
    const habits = new HabitsController(bot, menu);
    const botCtrl = new BotController(bot);

    habits.init();
    logger.info('✅ HabitsController inicializado!');
    botCtrl.init();
    logger.info('✅ BotController inicializado!');
    menu.init();
    logger.info('✅ MenuController inicializado!');

    logger.info('🚀 Todos os controllers e listeners ativos!');
  };
  setupBot().catch(err => {
    logger.error('💥 Erro CRÍTICO no setupBot:', err);
    process.exit(1); // Fail fast in listener mode
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
