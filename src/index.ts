import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN não está definido no arquivo .env');
}

// Criar instância do bot
const bot = new TelegramBot(token, { polling: true });

// Palavras-chave para validar treino
const WORKOUT_KEYWORDS = ['eu treinei', 'treinei', 'treinado'];

// Armazena o estado de treino dos usuários (userId -> boolean)
const userWorkoutStatus = new Map<number, boolean>();

// Função para verificar se a mensagem contém palavras de treino
function hasWorkoutKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return WORKOUT_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Função para enviar motivação (áudio + imagem)
async function sendMotivation(chatId: number, userId: number) {
  try {
    const audioPath = path.join(__dirname, '../assets/motivation.mp3');
    const imagePath = path.join(__dirname, '../assets/motivation.jpg');

    // Enviar áudio motivacional
    if (fs.existsSync(audioPath)) {
      await bot.sendVoice(chatId, audioPath, {
        caption: '🔥 Vamos lá! Não desista dos seus objetivos! 💪'
      });
    } else {
      await bot.sendMessage(chatId, '🔥 Vamos lá! Não desista dos seus objetivos! 💪\n\nLembre-se: o treino de hoje é a força de amanhã!');
    }

    // Enviar imagem motivacional
    if (fs.existsSync(imagePath)) {
      await bot.sendPhoto(chatId, imagePath, {
        caption: '💪 Você consegue! Não deixe para amanhã o treino de hoje!'
      });
    }

    console.log(`Motivação enviada para usuário ${userId}`);
  } catch (error) {
    console.error('Erro ao enviar motivação:', error);
  }
}

// Função para enviar parabenização
async function sendCongratulations(chatId: number, userId: number) {
  try {
    const congratsMessages = [
      '🎉 Parabéns! Você treinou hoje! Continue assim! 💪',
      '👏 Excelente! Mais um treino concluído! Você está arrasando! 🔥',
      '⭐ Incrível! Você está no caminho certo! Continue treinando! 💯',
      '🏆 Mandou bem! Treino feito é sucesso garantido! 💪'
    ];

    const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
    await bot.sendMessage(chatId, randomMessage);

    console.log(`Parabenização enviada para usuário ${userId}`);
  } catch (error) {
    console.error('Erro ao enviar parabenização:', error);
  }
}

// Listener para mensagens
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text || '';

  if (!userId) return;

  // Verificar se a mensagem contém palavras-chave de treino
  if (hasWorkoutKeyword(text)) {
    // Marcar que o usuário treinou
    userWorkoutStatus.set(userId, true);
    
    // Enviar mensagem de parabéns
    await sendCongratulations(chatId, userId);
  }
});

// Comando /status para verificar se treinou hoje
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) return;

  const hasTrained = userWorkoutStatus.get(userId) || false;

  if (hasTrained) {
    await bot.sendMessage(chatId, '✅ Você já treinou hoje! Continue assim! 💪');
  } else {
    await bot.sendMessage(chatId, '❌ Você ainda não registrou seu treino hoje.');
    await sendMotivation(chatId, userId);
  }
});

// Comando /checktreino para verificar manualmente o status
bot.onText(/\/checktreino/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) return;

  const hasTrained = userWorkoutStatus.get(userId) || false;

  if (!hasTrained) {
    await sendMotivation(chatId, userId);
  } else {
    await sendCongratulations(chatId, userId);
  }
});

// Comando /reset para resetar o status de treino (útil para testes)
bot.onText(/\/reset/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  if (!userId) return;

  userWorkoutStatus.delete(userId);
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

// Função para verificação periódica (polling diário)
function setupDailyCheck() {
  // Reset status diário (às 00:00)
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // Próximo dia
    0, 0, 0 // 00:00:00
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    console.log('Resetando status de treino diário...');
    userWorkoutStatus.clear();
    
    // Configurar próxima verificação
    setInterval(() => {
      console.log('Resetando status de treino diário...');
      userWorkoutStatus.clear();
    }, 24 * 60 * 60 * 1000); // 24 horas
  }, msToMidnight);
}

// Iniciar verificação diária
setupDailyCheck();

console.log('🤖 Bot Queima Buchinho iniciado!');
console.log('📝 Aguardando mensagens...');

// Tratamento de erros
bot.on('polling_error', (error) => {
  console.error('Erro de polling:', error);
});
