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

const webhookUrl = process.env.WEBHOOK_URL;
const port = Number(process.env.PORT) || 3000;

let bot: TelegramBot;

if (mode === 'listener') {
  if (webhookUrl) {
    bot = new TelegramBot(token, { webHook: { port } });
    bot.setWebHook(`${webhookUrl}/bot${token}`);
    console.log(`🚀 Bot em modo WEBHOOK na porta ${port} e URL ${webhookUrl}`);
  } else {
    bot = new TelegramBot(token, { polling: true });
    console.log('🚀 Bot em modo POLLING ativado...');
  }
  
  const controller = new BotController(bot);
  controller.init();
} else {
  bot = new TelegramBot(token);
  startScheduler();
}

async function startScheduler() {
  const scheduler = new SchedulerService(bot);
  try {
    switch (mode) {
      case 'checker':
        console.log('⏰ Modo CHECKER ativado...');
        await scheduler.runDailyCheck();
        break;
      case 'reminder_morning':
        console.log('⏰ Modo MORNING ativado...');
        await scheduler.sendMorningReminder();
        break;
      case 'reminder_conditional':
        console.log('⏰ Modo CONDITIONAL ativado...');
        await scheduler.sendConditionalReminder();
        break;
      case 'reminder_water':
        console.log('💧 Modo WATER ativado...');
        await scheduler.sendWaterReminder();
        break;
      case 'reminder_food_cafe':
        console.log('🍳 Modo FOOD CAFÉ ativado...');
        await scheduler.sendFoodReminder('cafe');
        break;
      case 'reminder_food_almoco':
        console.log('🍽️ Modo FOOD ALMOÇO ativado...');
        await scheduler.sendFoodReminder('almoco');
        break;
      case 'reminder_food_jantar':
        console.log('🌙 Modo FOOD JANTAR ativado...');
        await scheduler.sendFoodReminder('jantar');
        break;
      default:
        console.warn(`Modo desconhecido: ${mode}`);
    }
    process.exit(0);
  } catch (error) {
    console.error(`❌ Erro no modo ${mode}:`, error);
    process.exit(1);
  }
}

start();
