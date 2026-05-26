import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { SchedulerService } from './services/scheduler.service';
import { BotController } from './controllers/bot.controller';
import { MenuController } from './controllers/menu.controller';
import { HabitsController } from './controllers/habits.controller';
import { redisService } from './services/redis.service';
import { logger } from './utils/logger';
import { HealthServer, markPollingAlive, setPollingMode } from './utils/server';
import { pool } from './config/database';
import { notifyStartup, notifyShutdown, notifyCrash } from './utils/notifications';

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
let botMode: 'polling' | 'webhook' | 'none' = 'none';

async function shutdown(signal: string) {
  logger.info(`🛑 Recebido ${signal}. Shutdown gracioso...`);
  try {
    if (bot) await notifyShutdown(bot).catch(() => {});
    if (botMode === 'polling') await bot?.stopPolling();
    else if (botMode === 'webhook') await (bot as any)?.closeWebHook?.();
  } catch { /* ignore */ }
  await healthServer.close();
  await redisService.disconnect();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', async (err) => {
  logger.error('💥 Uncaught Exception:', err);
  if (bot) await notifyCrash(bot, err).catch(() => {});
  process.exit(1);
});
process.on('unhandledRejection', async (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('💥 Unhandled Rejection:', err);
  if (bot) await notifyCrash(bot, err).catch(() => {});
  process.exit(1);
});

const allowedUpdates = ['message', 'callback_query', 'channel_post', 'edited_message'];

if (mode === 'listener') {
  redisService.connect();
  const setupBot = async () => {
    logger.info('⚙️ Iniciando setup do Bot...');
    if (webhookUrl) {
      try {
        bot = new TelegramBot(token, { webHook: { port } } as any);
        await bot.deleteWebHook();
        await bot.setWebHook(`${webhookUrl}/bot${token}`, { allowed_updates: allowedUpdates } as any);
        botMode = 'webhook';
        logger.info(`🚀 Webhook ativo: ${webhookUrl}`);
      } catch (err: any) {
        logger.error(`⚠️ Webhook falhou, tentando Polling: ${err.message}`);
        setupPolling();
      }
    } else {
      setupPolling();
    }

    attachControllers();
    await notifyStartup(bot).catch(() => {});
  };

  setupBot().catch(err => {
    logger.error('💥 Erro no setupBot:', err);
    process.exit(1);
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

let pollingHeartbeatTimer: ReturnType<typeof setInterval> | null = null;

function setupPolling() {
  if (bot && botMode === 'polling') {
    try { bot.stopPolling().catch(() => {}); } catch { /* ignore */ }
  }
  if (pollingHeartbeatTimer) { clearInterval(pollingHeartbeatTimer); pollingHeartbeatTimer = null; }

  bot = new TelegramBot(token!, { polling: { interval: 1000, params: { allowed_updates: allowedUpdates } } } as any);
  botMode = 'polling';
  setPollingMode(true);
  logger.info(`🚀 Polling ativo!`);

  // Heartbeat: prove Telegram API is reachable every 60s
  pollingHeartbeatTimer = setInterval(async () => {
    try {
      await bot.getMe();
      markPollingAlive();
    } catch {
      logger.warn('⚠️ Heartbeat: getMe() falhou — polling pode estar morto');
    }
  }, 60_000);
  markPollingAlive(); // reset on (re)start

  bot.on('polling_error', (err: any) => {
    const code = err?.code || '';
    logger.error('❌ [DEBUG] Erro no Polling:', err?.message ?? err);
    if (code === 'EFATAL' || code === 'ECONNRESET' || err?.message?.includes('ECONNRESET')) {
      logger.warn('🔄 Polling morreu (ECONNRESET/EFATAL). Reconectando em 5s...');
      setTimeout(() => { setupPolling(); attachControllers(); }, 5000);
    }
  });

  bot.on('message', (msg) => {
    markPollingAlive();
    logger.info(`📩 Msg: Chat=${msg.chat.id}, User=${msg.from?.username}, Texto="${msg.text}"`);
  });
  bot.on('callback_query', (q) => {
    markPollingAlive();
    logger.info(`🖱️ Callback: Data=${q.data}, Chat=${q.message?.chat.id}`);
  });
}


let cronJobsInitialized = false;
function setupCronJobs() {
  if (cronJobsInitialized) return;
  cronJobsInitialized = true;
  
  const scheduler = new SchedulerService(bot);
  cron.schedule('30 22 * * *', () => scheduler.runDailyCheck(), { timezone: 'America/Sao_Paulo' });
  cron.schedule('30 6 * * *', () => scheduler.sendMorningReminder(), { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 6 * * *', () => scheduler.sendGymReminder(), { timezone: 'America/Sao_Paulo' });
  cron.schedule('30 15 * * *', () => scheduler.sendFoodReminder('cafe_tarde'), { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 12,18 * * *', () => scheduler.sendConditionalReminder(), { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 9,11,14,17 * * *', () => scheduler.sendWaterReminder(), { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 8 * * *', () => scheduler.sendFoodReminder('cafe'), { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 12 * * *', () => scheduler.sendFoodReminder('almoco'), { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 19 * * *', () => scheduler.sendFoodReminder('jantar'), { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 20 * * *', () => scheduler.sendHabitsCheckReminder(), { timezone: 'America/Sao_Paulo' });
  cron.schedule('0 22 * * *', () => scheduler.runDailyMikaAudit(), { timezone: 'America/Sao_Paulo' });
  
  logger.info('⏰ CronJobs internos inicializados!');
}

function attachControllers() {
  new HabitsController(bot, new MenuController(bot)).init();
  new BotController(bot).init();
  new MenuController(bot).init();
  logger.info('🚀 Controllers ativos!');
}

async function runReminder(scheduler: SchedulerService, mode: string) {
  const m = mode.replace('reminder_', '');
  if (m === 'morning') await scheduler.sendMorningReminder();
  else if (m === 'conditional') await scheduler.sendConditionalReminder();
  else if (m === 'water') await scheduler.sendWaterReminder();
  else if (m === 'habits_check') await scheduler.sendHabitsCheckReminder();
  else if (m === 'daily_audit') await scheduler.runDailyMikaAudit();
  else if (m === 'gym') await scheduler.sendGymReminder();
  else if (m.startsWith('food_')) await scheduler.sendFoodReminder(m.replace('food_', '') as any);
}
