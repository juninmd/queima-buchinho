import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const mode = process.env.BOT_MODE || 'listener'; // 'listener' or 'checker'

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN não está definido no arquivo .env');
}

// Criar instância do bot (polling apenas no modo listener)
const bot = new TelegramBot(token, { polling: mode === 'listener' });

// Palavras-chave para validar treino
const WORKOUT_KEYWORDS = ['eu treinei', 'treinei', 'treinado'];

// Arquivo de persistência
const DATA_FILE = path.join(__dirname, '../data/workout-status.json');

// Armazena o estado de treino dos usuários (userId -> date string)
const userWorkoutStatus = new Map<number, string>();

// Carregar dados salvos
function loadWorkoutStatus() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      const today = new Date().toDateString();

      // Carregar apenas dados de hoje
      Object.entries(parsed).forEach(([userId, date]) => {
        if (date === today) {
          userWorkoutStatus.set(Number(userId), date as string);
        }
      });

      console.log(`✅ Dados carregados: ${userWorkoutStatus.size} usuários`);
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
}

// Salvar dados
function saveWorkoutStatus() {
  try {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const data: { [key: string]: string } = {};
    userWorkoutStatus.forEach((date, userId) => {
      data[userId.toString()] = date;
    });

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

// Função para verificar se a mensagem contém palavras de treino
function hasWorkoutKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return WORKOUT_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Função para verificar se o usuário treinou hoje
function hasTrainedToday(userId: number): boolean {
  const lastWorkoutDate = userWorkoutStatus.get(userId);
  const today = new Date().toDateString();
  return lastWorkoutDate === today;
}

// Função para marcar treino do usuário
function markWorkout(userId: number) {
  const today = new Date().toDateString();
  userWorkoutStatus.set(userId, today);
  saveWorkoutStatus();
}

// Configuração dos arquivos de áudio
const AUDIO_FILES = {
  MOTIVATION: 'tai-lung-como-nao-posso_NrQYPc2.mp3',
  NOT_TRAINED: ['tf_nemesis.mp3', 'voce-nao-tem-aura.mp3']
};

// Função para enviar áudio quando não treinou (Nemesis ou Aura)
async function sendNotTrainedNotification(chatId: number, userId: number) {
  try {
    const randomAudio = AUDIO_FILES.NOT_TRAINED[Math.floor(Math.random() * AUDIO_FILES.NOT_TRAINED.length)];
    const audioPath = path.join(__dirname, `../assets/${randomAudio}`);
    const imagePath = path.join(__dirname, '../assets/motivation.jpg');

    // Enviar áudio "tough love"
    if (fs.existsSync(audioPath)) {
      await bot.sendVoice(chatId, audioPath, {
        caption: '😤 Você não treinou hoje! Escute isso e reflita...'
      });
    } else {
      console.warn(`Áudio não encontrado: ${audioPath}`);
      await bot.sendMessage(chatId, '😤 Você não treinou hoje! Sem desculpas!');
    }

    // Enviar imagem motivacional (opcional, mantendo comportamento anterior)
    if (fs.existsSync(imagePath)) {
      await bot.sendPhoto(chatId, imagePath, {
        caption: '💪 O corpo alcança o que a mente acredita. Vá treinar!'
      });
    }

    console.log(`Notificação de não-treino enviada para usuário ${userId}`);
  } catch (error) {
    console.error('Erro ao enviar notificação de não-treino:', error);
  }
}

// Função para enviar motivação geral (Tai Lung)
async function sendGeneralMotivation(chatId: number) {
  try {
    const audioPath = path.join(__dirname, `../assets/${AUDIO_FILES.MOTIVATION}`);

    if (fs.existsSync(audioPath)) {
      await bot.sendVoice(chatId, audioPath, {
        caption: '🔥 Motivação suprema! Acredite em você!'
      });
    } else {
      console.warn(`Áudio não encontrado: ${audioPath}`);
      await bot.sendMessage(chatId, '🔥 Acredite no seu potencial! Você é capaz de tudo!');
    }
    console.log(`Motivação geral enviada para chat ${chatId}`);
  } catch (error) {
    console.error('Erro ao enviar motivação geral:', error);
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

// Função para buscar atualizações via getUpdates (sem polling)
async function checkForWorkoutMessages() {
  try {
    console.log('🔍 Verificando mensagens do dia...');

    // Buscar updates das últimas 24 horas
    const updates = await bot.getUpdates({ offset: -1, limit: 100 });

    const today = new Date().toDateString();
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
          markWorkout(userId);
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
    loadWorkoutStatus();

    // Buscar mensagens do dia para atualizar status
    await checkForWorkoutMessages();

    // Verificar se o usuário principal treinou
    const userId = chatId; // No modo checker, usamos o CHAT_ID como userId
    const hasTrained = hasTrainedToday(Number(userId));

    if (hasTrained) {
      console.log('✅ Usuário treinou hoje - enviando parabéns');
      await sendCongratulations(Number(chatId), Number(userId));
    } else {
      console.log('❌ Usuário não treinou hoje - enviando motivação');
      await sendNotTrainedNotification(Number(chatId), Number(userId));
    }

    console.log('✅ Verificação diária concluída!');
  } catch (error) {
    console.error('Erro na verificação diária:', error);
    throw error;
  }
}

// Modo Listener: Escuta mensagens continuamente
if (mode === 'listener') {
  console.log('🎧 Modo LISTENER ativado - monitorando mensagens...');

  // Listener para mensagens
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text || '';

    if (!userId) return;

    // Verificar se a mensagem contém palavras-chave de treino
    if (hasWorkoutKeyword(text)) {
      // Marcar que o usuário treinou
      markWorkout(userId);

      // Enviar mensagem de parabéns
      await sendCongratulations(chatId, userId);
    }
  });

  // Comando /status para verificar se treinou hoje
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const hasTrained = hasTrainedToday(userId);

    if (hasTrained) {
      await bot.sendMessage(chatId, '✅ Você já treinou hoje! Continue assim! 💪');
    } else {
      await bot.sendMessage(chatId, '❌ Você ainda não registrou seu treino hoje.');
      await sendNotTrainedNotification(chatId, userId);
    }
  });

  // Comando /checktreino para verificar manualmente o status
  bot.onText(/\/checktreino/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const hasTrained = hasTrainedToday(userId);

    if (!hasTrained) {
      await sendNotTrainedNotification(chatId, userId);
    } else {
      await sendCongratulations(chatId, userId);
    }
  });

  // Comando /motivar para receber motivação geral
  bot.onText(/\/motivar/, async (msg) => {
    const chatId = msg.chat.id;
    await sendGeneralMotivation(chatId);
  });

  // Comando /reset para resetar o status de treino (útil para testes)
  bot.onText(/\/reset/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    userWorkoutStatus.delete(userId);
    saveWorkoutStatus();
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

  // Carregar dados salvos ao iniciar
  loadWorkoutStatus();

  console.log('🤖 Bot Queima Buchinho iniciado!');
  console.log('📝 Aguardando mensagens...');

  // Tratamento de erros
  bot.on('polling_error', (error) => {
    console.error('Erro de polling:', error);
  });
}

// Modo Checker: Executa verificação única e sai
if (mode === 'checker') {
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
