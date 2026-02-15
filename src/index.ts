import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { formatBrasiliaTime, getSurpriseMessage } from './utils/time';
import { workoutService } from './services/workout.service';
import { memeService } from './services/meme.service';
import { SchedulerService } from './services/scheduler.service';
import { sendAudioMessage } from './utils/telegram';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const mode = process.env.BOT_MODE || 'listener'; // 'listener' or 'checker'

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN não está definido no arquivo .env');
}

// Criar instância do bot
// Polling deve ser true APENAS se estivermos no modo listener
const bot = new TelegramBot(token, { polling: mode === 'listener' });

// Palavras-chave para validar treino
const WORKOUT_KEYWORDS = ['eu treinei', 'treinei', 'treinado'];

// Função para verificar se a mensagem contém palavras de treino
function hasWorkoutKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return WORKOUT_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

async function start() {
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
        // Feedback visual no listener.
        console.log(`✅ Usuário ${userId} enviou mensagem de treino.`);
        await bot.sendMessage(chatId, '🎉 Parabéns! Você treinou hoje! Continue assim! 💪 (Feedback imediato)');
      }
    });

    // Comandos de feedback
    bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      await bot.sendMessage(chatId, 'ℹ️ O status oficial é verificado às 22h pelo GitHub Actions.');
    });

    bot.onText(/\/checktreino/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      if (!userId) return;
      // Validação simplificada no listener apenas para feedback
      // Calling workoutService.checkDailyMessages inside listener might be confusing if listener is also consuming messages?
      // Let's just say "checktreino no modo listener mostra status de hoje baseado no histórico"
      try {
        const { trained } = await workoutService.checkDailyMessages(bot);
        if (!trained) {
          const roastMsg = memeService.getRoastMessage();
          const roastAudio = memeService.getRoastAudio();
          await bot.sendMessage(chatId, roastMsg);
          if (roastAudio) await sendAudioMessage(bot, chatId, roastAudio, 'Reflita...');
        } else {
          await bot.sendMessage(chatId, '🎉 Parabéns! Você já treinou hoje!');
        }
      } catch (e) {
        console.error("Erro no checktreino listener:", e);
        await bot.sendMessage(chatId, "Erro ao verificar status.");
      }
    });

    bot.onText(/\/hora/, async (msg) => {
      const chatId = msg.chat.id;
      const time = formatBrasiliaTime();
      const surprise = getSurpriseMessage();
      const message = `🕒 Horário de Brasília: ${time}\n\n${surprise}`;
      await bot.sendMessage(chatId, message);
    });

    bot.onText(/\/motivar/, async (msg) => {
      const chatId = msg.chat.id;
      const motivationAudio = memeService.getMotivationAudio();
      await sendAudioMessage(bot, chatId, motivationAudio, '🔥 Motivação suprema! Acredite em você!');
    });

    bot.onText(/\/reset/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      if (!userId) return;
      workoutService.resetWorkout(userId);
      await bot.sendMessage(chatId, '🔄 Status de treino resetado!');
    });

    bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
🔥 *Queima Buchinho Bot* 🔥

Este bot ajuda você a manter a motivação para treinar!

*Como usar:*
- Envie "eu treinei" quando treinar
- O bot verifica automaticamente às 22h (via GitHub Actions)
- Use /status para verificar
- Use /checktreino para teste manual
- Use /hora para horário
- Use /motivar para áudio motivacional
            `;
      await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    console.log('🤖 Bot Queima Buchinho iniciado (Modo Listener)!');

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
