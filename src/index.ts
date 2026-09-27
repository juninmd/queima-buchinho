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
import { DashboardApiServer } from './api/dashboard.server';
import { pool } from './config/database';
import { notifyStartup, notifyShutdown, notifyCrash } from './utils/notifications';
import { sendDailyFicha } from './features/ficha/ficha.publisher';
import { unlessPaused, isOwnerPaused } from './features/pause/pause.guard';
import { registerBotCommands } from './config/commands';

dotenv.config();
const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const mode = process.env.BOT_MODE || 'listener';
const webhookUrl = process.env.WEBHOOK_URL;
const port = Number(process.env.PORT) || 3000;
const healthPort = Number(process.env.HEALTH_PORT) || 8080;

if (!token) throw new Error('TELEGRAM_BOT_TOKEN ou BOT_TOKEN não definido');

const healthServer = new HealthServer(healthPort);
healthServer.start();

const dashboardUserId = Number(process.env.USER_ID || process.env.CHAT_ID) || 0;
const dashboardPort = Number(process.env.DASHBOARD_PORT) || 8081;
const dashboardServer = new DashboardApiServer(dashboardPort, dashboardUserId);
if (process.env.DASHBOARD_TOKEN) dashboardServer.start();
else logger.warn('⚠️ DASHBOARD_TOKEN não definido — Dashboard API desativada');

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
  await dashboardServer.close();
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
    await registerBotCommands(bot);
    setupCronJobs();
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
      if (mode !== 'reminder_birthday' && await isOwnerPaused()) logger.info(`⏸️ Pausa ativa — ${mode} ignorado.`);
      else if (mode === 'checker') await scheduler.runDailyCheck();
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
  // Todo job respeita /pausar, exceto aniversário.
  const at = (expr: string, name: string, job: () => Promise<unknown>) =>
    cron.schedule(expr, unlessPaused(name, job), { timezone: 'America/Sao_Paulo' });
  // Manhã: um card só (bom dia + cardápio + menu) às 06:00; ficha segue separada (seg–sáb).
  at('0 6 * * *', 'good_morning', () => scheduler.sendGoodMorning());
  at('0 6 * * 1-6', 'ficha', () => sendDailyFicha(bot));
  // Lembretes pulam sozinhos quando a tarefa já foi feita (água no ritmo, refeição marcada).
  at('0 8 * * *', 'food_cafe', () => scheduler.sendFoodReminder('cafe'));
  at('0 9,11,14,17 * * *', 'water', () => scheduler.sendWaterReminder());
  at('0 12 * * *', 'food_almoco', () => scheduler.sendFoodReminder('almoco'));
  at('0 12,18 * * *', 'conditional', () => scheduler.sendConditionalReminder());
  at('30 15 * * *', 'food_cafe_tarde', () => scheduler.sendFoodReminder('cafe_tarde'));
  at('0 19 * * *', 'food_jantar', () => scheduler.sendFoodReminder('jantar'));
  at('0 20 * * *', 'habits_check', () => scheduler.sendHabitsCheckReminder());
  // Noite: o fechamento das 21:30 concentra tudo; auditoria (22:00) e checker (22:30) saíram da agenda.
  at('30 21 * * *', 'daily_report', () => scheduler.sendDailyReport());
  at('50 23 * * *', 'close_day', () => scheduler.closeDay());
  cron.schedule('0 9 * * *', () => scheduler.sendBirthdayIfToday(), { timezone: 'America/Sao_Paulo' });

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
  else if (m === 'good_morning') await scheduler.sendGoodMorning();
  else if (m === 'conditional') await scheduler.sendConditionalReminder();
  else if (m === 'water') await scheduler.sendWaterReminder();
  else if (m === 'habits_check') await scheduler.sendHabitsCheckReminder();
  else if (m === 'daily_audit') await scheduler.runDailyMikaAudit();
  else if (m === 'daily_report') await scheduler.sendDailyReport();
  else if (m === 'birthday') await scheduler.sendBirthdayIfToday();
  else if (m === 'close_day') await scheduler.closeDay();
  else if (m === 'gym' || m === 'ficha') await sendDailyFicha(bot);
  else if (m.startsWith('food_')) await scheduler.sendFoodReminder(m.replace('food_', '') as any);
}
