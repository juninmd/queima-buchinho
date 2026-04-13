import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { SchedulerService } from './services/scheduler.service';
import { BotController } from './controllers/bot.controller';
import { MenuController } from './controllers/menu.controller';
import { HabitsController } from './controllers/habits.controller';
import { redisService } from './services/redis.service';
import { logger } from './utils/logger';

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
  redisService.connect();

  if (webhookUrl) {
    bot = new TelegramBot(token, { 
      webHook: { 
        port,
        path: `/bot${token}` 
      } 
    } as any);
    
    // Força a limpeza e reconfiguração total do Webhook no boot
    const setupWebhook = async () => {
      try {
        await bot.deleteWebHook();
        const url = `${webhookUrl}/bot${token}`;
        await bot.setWebHook(url, {
          allowed_updates: ['message', 'channel_post', 'callback_query']
        });
        
        // Registrar os comandos slash para aparecerem no Telegram
        await bot.setMyCommands([
          { command: 'menu', description: '🔥 Abrir menu de hábitos do dia' },
          { command: 'progresso', description: '📊 Ver progresso do dia' },
          { command: 'agua', description: '💧 Registrar consumo de água' },
          { command: 'peso', description: '⚖️ Registrar peso (ex: /peso 85.5)' },
          { command: 'semana', description: '😈 Resumo semanal (Mika tóxica)' },
          { command: 'instante', description: '🎶 Tocar som do MyInstants (ex: /instante xaropinho)' },
          { command: 'motivar', description: '🔥 Receber áudio motivacional' },
          { command: 'hora', description: '🕒 Ver horário de Brasília' },
          { command: 'status', description: 'ℹ️ Ver informações do bot' },
          { command: 'help', description: '❓ Ver lista completa de comandos' },
          { command: 'checktreino', description: '💪 Verificação manual de treino hoje' },
          { command: 'reset', description: '🔄 Resetar status de treino de hoje' }
        ]);

        logger.info(`🚀 Webhook configurado: ${webhookUrl}/bot***[TOKEN_OCULTO]***`);
        logger.info('✅ Comandos registrados com sucesso!');
      } catch (err) {
        logger.error('❌ Erro ao configurar Webhook/Comandos:', err);
      }
    };
    
    setupWebhook();
    logger.info(`🚀 Bot em modo WEBHOOK na porta ${port}`);
  } else {
    bot = new TelegramBot(token);
    
    // Limpa qualquer webhook anterior antes de iniciar o polling para evitar Erro 409
    const setupPolling = async () => {
        try {
            await bot.deleteWebHook();
            await bot.startPolling();
            logger.info('🚀 Bot em modo POLLING ativado e Webhook limpo...');
        } catch (err) {
            logger.error('❌ Erro ao limpar Webhook para Polling:', err);
        }
    };
    setupPolling();
  }

  const menuController = new MenuController(bot);
  const habitsController = new HabitsController(bot, menuController);
  const botController = new BotController(bot);

  menuController.init();
  habitsController.init();
  botController.init();
} else {
  bot = new TelegramBot(token);
  redisService.connect();
  startScheduler();
}

async function startScheduler() {
  const scheduler = new SchedulerService(bot);
  
  // Timeout global de 2 minutos para evitar acúmulo de pods zumbis
  const timeoutId = setTimeout(() => {
    logger.error(`🚨 [Timeout] O modo ${mode} demorou demais e foi finalizado.`);
    process.exit(1);
  }, 120000);

  try {
    switch (mode) {
      case 'checker':
        logger.info('⏰ Modo CHECKER ativado...');
        await scheduler.runDailyCheck();
        break;
      case 'reminder_morning':
        logger.info('⏰ Modo MORNING ativado...');
        await scheduler.sendMorningReminder();
        break;
      case 'reminder_conditional':
        logger.info('⏰ Modo CONDITIONAL ativado...');
        await scheduler.sendConditionalReminder();
        break;
      case 'reminder_water':
        logger.info('💧 Modo WATER ativado...');
        await scheduler.sendWaterReminder();
        break;
      case 'reminder_food_cafe':
        logger.info('🍳 Modo FOOD CAFÉ ativado...');
        await scheduler.sendFoodReminder('cafe');
        break;
      case 'reminder_food_almoco':
        logger.info('🍽️ Modo FOOD ALMOÇO ativado...');
        await scheduler.sendFoodReminder('almoco');
        break;
      case 'reminder_food_jantar':
        logger.info('🌙 Modo FOOD JANTAR ativado...');
        await scheduler.sendFoodReminder('jantar');
        break;
      case 'reminder_habits_check':
        logger.info('📋 Modo HABITS CHECK ativado...');
        await scheduler.sendHabitsCheckReminder();
        break;
      default:
        logger.warn(`Modo desconhecido: ${mode}`);
    }
    clearTimeout(timeoutId);
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Erro no modo ${mode}:`, error);
    process.exit(1);
  }
}
