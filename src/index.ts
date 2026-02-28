import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { SchedulerService } from './services/scheduler.service';
import { BotController } from './controllers/bot.controller';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const mode = process.env.BOT_MODE || 'listener';

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN não está definido no arquivo .env');
}

const bot = new TelegramBot(token, { polling: mode === 'listener' });

async function start() {
  if (mode === 'listener') {
    const controller = new BotController(bot);
    controller.init();
  } else if (mode === 'checker') {
    console.log('⏰ Modo CHECKER ativado (GitHub Actions trigger)...');
    const scheduler = new SchedulerService(bot);
    try {
      await scheduler.runDailyCheck();
      console.log('✅ Verificação diária concluída.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro na verificação diária:', error);
      process.exit(1);
    }
  }
}

start();
