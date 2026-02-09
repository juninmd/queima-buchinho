import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { StorageService } from './services/storage';
import { NotificationService } from './services/notifications';
import { hasWorkoutKeyword } from './utils/validators';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const mode = process.env.BOT_MODE || 'listener'; // 'listener' or 'checker'

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN não está definido no arquivo .env');
}

// Criar instâncias dos serviços
const bot = new TelegramBot(token, { polling: mode === 'listener' });
const storage = new StorageService();
const notifications = new NotificationService(bot);

// Função para buscar atualizações via getUpdates (sem polling)
async function checkForWorkoutMessages() {
  try {
    console.log('🔍 Verificando mensagens do dia...');
    
    // Buscar updates das últimas 24 horas
    const updates = await bot.getUpdates({ offset: -1, limit: 100 });
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    for (const update of updates) {
      if (update.message) {
        const msg = update.message;
        const userId = msg.from?.id;
        const text = msg.text || '';
        const msgDate = new Date(msg.date * 1000);
        
        // Verificar se a mensagem é de hoje e contém palavras-chave
        if (userId && msgDate >= todayStart && hasWorkoutKeyword(text)) {
          console.log(`✅ Encontrada mensagem de treino do usuário ${userId}`);
          await storage.markWorkout(userId);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
  }
}

// Função para enviar verificação diária (modo checker)
async function performDailyCheck() {
  try {
    if (!chatId) {
      throw new Error('CHAT_ID não está definido. Necessário para modo checker.');
    }

    console.log('⏰ Executando verificação diária às 22h...');
    
    // Carregar status dos usuários
    await storage.load();
    
    // Buscar mensagens do dia para atualizar status
    await checkForWorkoutMessages();
    
    // Verificar se o usuário principal treinou
    const userId = Number(chatId); // No modo checker, usamos o CHAT_ID como userId
    const hasTrained = storage.hasTrainedToday(userId);
    
    if (hasTrained) {
      console.log('✅ Usuário treinou hoje - enviando parabéns');
      await notifications.sendCongratulations(userId, userId);
    } else {
      console.log('❌ Usuário não treinou hoje - enviando motivação');
      await notifications.sendMotivation(userId, userId);
    }
    
    console.log('✅ Verificação diária concluída!');
  } catch (error) {
    console.error('Erro na verificação diária:', error);
    throw error;
  }
}

// Inicialização do Listener
async function startListener() {
  console.log('🎧 Modo LISTENER ativado - monitorando mensagens...');
  
  // Carregar dados salvos ao iniciar
  await storage.load();

  // Listener para mensagens
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text || '';

    if (!userId) return;

    // Verificar se a mensagem contém palavras-chave de treino
    if (hasWorkoutKeyword(text)) {
      // Marcar que o usuário treinou
      await storage.markWorkout(userId);
      
      // Enviar mensagem de parabéns
      await notifications.sendCongratulations(chatId, userId);
    }
  });

  // Comando /status para verificar se treinou hoje
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const hasTrained = storage.hasTrainedToday(userId);

    if (hasTrained) {
      await bot.sendMessage(chatId, '✅ Você já treinou hoje! Continue assim! 💪');
    } else {
      await bot.sendMessage(chatId, '❌ Você ainda não registrou seu treino hoje.');
      await notifications.sendMotivation(chatId, userId);
    }
  });

  // Comando /checktreino para verificar manualmente o status
  bot.onText(/\/checktreino/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const hasTrained = storage.hasTrainedToday(userId);

    if (hasTrained) {
      await notifications.sendCongratulations(chatId, userId);
    } else {
      await notifications.sendMotivation(chatId, userId);
    }
  });

  // Comando /reset para resetar o status de treino (útil para testes)
  bot.onText(/\/reset/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    await storage.resetWorkout(userId);
    await bot.sendMessage(chatId, '🔄 Status de treino resetado! Envie uma mensagem com "eu treinei", "treinei" ou "treinado" para marcar seu treino.');
  });

  // Comando /help para mostrar ajuda
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
🔥 *Queima Buchinho Bot* 🔥

Este bot ajuda você a manter a motivação para treinar!

*Como usar:*
- Envie uma mensagem contendo "eu treinei", "treinei" ou "treinado" quando você treinar
- Use /status para verificar se você já treinou hoje
- Use /checktreino para verificar e receber motivação se necessário
- Use /reset para resetar seu status de treino
- Use /help para ver esta mensagem

💪 *Vamos treinar!*
    `;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  console.log('🤖 Bot Queima Buchinho iniciado!');
  console.log('📝 Aguardando mensagens...');

  // Tratamento de erros
  bot.on('polling_error', (error) => {
    console.error('Erro de polling:', error);
  });
}

// Execução principal
(async () => {
  if (mode === 'listener') {
    await startListener();
  } else if (mode === 'checker') {
    console.log('⏰ Modo CHECKER ativado - executando verificação diária...');

    performDailyCheck()
      .then(() => {
        console.log('✅ Verificação concluída com sucesso!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Erro na verificação:', error);
        process.exit(1);
      });
  }
})();
