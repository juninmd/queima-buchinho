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
  } else {
    const scheduler = new SchedulerService(bot);
    try {
      if (mode === 'checker') {
        console.log('⏰ Modo CHECKER ativado (GitHub Actions trigger)...');
        await scheduler.runDailyCheck();
        console.log('✅ Verificação diária concluída.');
      } else if (mode === 'reminder_morning') {
        console.log('⏰ Modo MUITO BOM DIA ativado (GitHub Actions trigger)...');
        await scheduler.sendMorningReminder();
        console.log('✅ Lembrete matinal enviado.');
      } else if (mode === 'reminder_conditional') {
        console.log('⏰ Modo COBRANÇA ativado (GitHub Actions trigger)...');
        await scheduler.sendConditionalReminder();
        console.log('✅ Cobrança de treino executada.');
      } else {
        console.warn(`Modo desconhecido: ${mode}`);
      }
      process.exit(0);
    } catch (error) {
      console.error(`❌ Erro no modo ${mode}:`, error);
      process.exit(1);
    }
  }
}

start();
