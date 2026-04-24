import TelegramBot from 'node-telegram-bot-api';
import { habitsService } from '../services/habits.service';
import { metricsService } from '../services/metrics.service';
import { ollamaService } from '../services/ollama.service';
import { myInstantsService } from '../services/myinstants.service';
import { HABITS, getProgressBar } from '../config/habits';
import { logger } from '../utils/logger';
import { ttsService } from '../services/tts.service';
import { sendAudioMessage } from '../utils/telegram';
import { DIET_PLAN } from '../config/diet';
import { getBrasiliaDayName } from '../utils/time';

export class MenuController {
  constructor(private bot: TelegramBot) {}

  public init() {
    const handleCommand = async (msg: TelegramBot.Message) => {
      const text = msg.text || '';
      logger.info(`[MenuController] Recebido comando: ${text} de ${msg.from?.id}`);

      // Suporte para /comando ou /comando@botname
      const cleanText = text.split(' ')[0].split('@')[0].toLowerCase();

      if (['/menu', '/start', '/progresso'].includes(cleanText)) {
        return this.showMenu(msg);
      }
      if (cleanText === '/help') return this.showHelp(msg);
      if (cleanText === '/agua') return this.showWater(msg);
      if (cleanText === '/semana') return this.showWeekly(msg);
      if (cleanText === '/cardapio') return this.showDiet(msg.chat.id);
    };

    this.bot.on('message', async (msg) => {
      if (msg.text?.startsWith('/')) {
        await handleCommand(msg).catch(err => logger.error('[MenuController] Erro no handleCommand:', err));    
      }
    });
    this.bot.on('channel_post', async (msg) => {
      if (msg.text?.startsWith('/')) {
        await handleCommand(msg).catch(err => logger.error('[MenuController] Erro no handleCommand:', err));    
      }
    });
  }

  public async showMenu(msg: TelegramBot.Message) {
    const userId = msg.from?.id || msg.sender_chat?.id;
    const chatId = msg.chat.id;
    if (!userId) return;

    await this.showMenuToUser(chatId, userId);
  }

  public async showMenuToUser(chatId: number, userId: number) {
    const { text, keyboard } = await this.buildMenuContent(userId);
    await this.bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  public async refreshMenu(chatId: number, messageId: number, userId: number) {
    const { text, keyboard } = await this.buildMenuContent(userId);
    try {
      await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (_) { /* message unchanged */ }
  }

  private async buildMenuContent(userId: number) {
    const status = await habitsService.getStatus(userId);
    const water = await metricsService.getTodaySum(userId, 'water');
    const { completed, total } = await habitsService.getCompletedCount(userId);
    const bar = getProgressBar(completed, total);

    let text = `<b>🔥 Queima Buchinho - Menu do Dia 🔥</b>\n\n`;
    text += `Progresso: ${completed}/${total} hábitos\n`;
    text += `<code>${bar}</code>\n\n`;
    text += `💧 Água hoje: ${water}ml\n\n`;
    text += `Toque para marcar/desmarcar:`;

    const keyboard = this.buildKeyboard(status);
    return { text, keyboard };
  }

  private buildKeyboard(status: Record<string, boolean>): TelegramBot.InlineKeyboardButton[][] {
    const rows: TelegramBot.InlineKeyboardButton[][] = [];
    const pairs = [];
    for (let i = 0; i < HABITS.length; i += 2) {
      const row = [HABITS[i]];
      if (HABITS[i + 1]) row.push(HABITS[i + 1]);
      pairs.push(row);
    }

    for (const pair of pairs) {
      rows.push(pair.map(h => ({
        text: `${h.emoji} ${h.label} ${status[h.key] ? '✅' : '❌'}`,
        callback_data: `habit_${h.key}`
      })));
    }

    rows.push([
      { text: '💧 +250ml', callback_data: 'add_water_250' },
      { text: '💧 +500ml', callback_data: 'add_water_500' },
      { text: '💧 +1L', callback_data: 'add_water_1000' }
    ]);

    rows.push([
      { text: '📊 Semana', callback_data: 'weekly_summary' },
      { text: '🍽️ Cardápio', callback_data: 'show_diet' },
      { text: '🚀 Motivar', callback_data: 'get_motivation' }
    ]);

    rows.push([
      { text: '🔄 Atualizar', callback_data: 'refresh_menu' }
    ]);

    return rows;
  }

  private async showHelp(msg: TelegramBot.Message) {
    const text = `<b>🔥 Queima Buchinho Bot 🔥</b>

<b>📋 Hábitos:</b>
/menu - Menu interativo com todos os hábitos
/progresso - Ver progresso do dia

<b>💧 Métricas:</b>
/agua - Registrar água (com botões)
/peso &lt;valor&gt; - Registrar peso
/semana - Relatório semanal (Mika tóxica 😈)

<b>💪 Treino:</b>
Envie "treinei" ou "fiz cardio" para registrar
/checktreino - Verificação manual
/cardio - Registrar cárdio rápido
/reset - Resetar treino de hoje

<b>🎵 Outros:</b>
/motivar - Áudio motivacional
/instante &lt;termo&gt; - Sons do MyInstants
/hora - Horário de Brasília`;

    await this.bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
  }

  private async showWater(msg: TelegramBot.Message) {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    const today = await metricsService.getTodaySum(userId, 'water');
    await this.bot.sendMessage(msg.chat.id,
      `💧 <b>Consumo de Água</b>\nTotal de hoje: ${today}ml\n\nEscolha uma quantidade:`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🥤 +250ml', callback_data: 'add_water_250' },
              { text: '🥛 +500ml', callback_data: 'add_water_500' }
            ],
            [{ text: '🍼 +1L', callback_data: 'add_water_1000' }]
          ]
        }
      });
  }

  public async showWeekly(msg: TelegramBot.Message) {
    const userId = msg.from?.id || msg.sender_chat?.id;
    const chatId = msg.chat.id;
    if (!userId) return;

    try {
      await this.bot.sendChatAction(chatId, 'typing');
      const summary = await metricsService.getWeeklySummary(userId);
      if (!summary) {
        await this.bot.sendMessage(chatId, '❌ Erro ao gerar resumo semanal.');
        return;
      }

      const response = await ollamaService.getWeeklyReport(summary);
      if (!response) {
        await this.bot.sendMessage(chatId, '❌ Não consegui gerar o relatório. Tenta de novo mais tarde!');
        return;
      }

      const wE = summary.current.metrics.water >= summary.previous.metrics.water ? '📈' : '📉';
      const tE = summary.current.workouts >= summary.previous.workouts ? '📈' : '📉';

      let report = `📊 <b>Resumo Semanal</b>\n\n`;
      report += `💪 Treinos: ${summary.current.workouts} vs ${summary.previous.workouts} ${tE}\n`;        
      report += `💧 Água: ${summary.current.metrics.water}ml vs ${summary.previous.metrics.water}ml ${wE}\n\n`;
      report += `🗣️ <b>Mika diz:</b> ${response.message}`;

      await this.bot.sendMessage(chatId, report, { parse_mode: 'HTML' });

      // Gerar e enviar áudio da Mika
      try {
        const audioPath = await ttsService.generateMikaAudio(response.message);
        await sendAudioMessage(this.bot, chatId, audioPath, `🎙️ Comentário da Mika`);
        await ttsService.cleanup(audioPath);
      } catch (error) {
        logger.error('Erro ao gerar áudio do resumo semanal:', error);
      }

      if (response.audioSearchTerm) {
        const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
        if (button?.audioUrl) {
          await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
        }
      }
    } catch (error) {
      logger.error('Erro no showWeekly:', error);
      await this.bot.sendMessage(chatId, '❌ Erro ao processar resumo semanal.');
    }
  }

  public async showDiet(chatId: number) {
    const dayName = getBrasiliaDayName();
    const diet = DIET_PLAN[dayName] || DIET_PLAN['segunda-feira'];

    let report = `🍴 <b>Cardápio de Hoje (${dayName})</b>\n\n`;
    report += `🍳 <b>Café da Manhã:</b>\n${diet.cafe}\n\n`;
    report += `🍽️ <b>Almoço:</b>\n${diet.almoco}\n\n`;
    report += `🌙 <b>Jantar:</b>\n${diet.jantar}\n\n`;
    report += `<i>Foca no objetivo, Lenda! 💪</i>`;

    await this.bot.sendMessage(chatId, report, { parse_mode: 'HTML' });
  }
}
