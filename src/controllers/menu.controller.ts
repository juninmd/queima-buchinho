import TelegramBot from 'node-telegram-bot-api';
import { habitsService } from '../services/habits.service';
import { metricsService } from '../services/metrics.service';
import { ollamaService } from '../services/ollama.service';
import { myInstantsService } from '../services/myinstants.service';
import { HABITS, getProgressBar } from '../config/habits';

export class MenuController {
  constructor(private bot: TelegramBot) {}

  public init() {
    this.bot.onText(/\/menu/, (msg) => this.showMenu(msg));
    this.bot.onText(/\/start/, (msg) => this.showMenu(msg));
    this.bot.onText(/\/progresso/, (msg) => this.showMenu(msg));
    this.bot.onText(/\/help/, (msg) => this.showHelp(msg));
    this.bot.onText(/\/agua/, (msg) => this.showWater(msg));
    this.bot.onText(/\/semana/, (msg) => this.showWeekly(msg));
  }

  public async showMenu(msg: TelegramBot.Message) {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    if (!userId) return;

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
Envie "treinei" para registrar o treino
/checktreino - Verificação manual
/reset - Resetar treino de hoje

<b>🎵 Outros:</b>
/motivar - Áudio motivacional
/instante &lt;termo&gt; - Sons do MyInstants
/hora - Horário de Brasília`;

    await this.bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
  }

  private async showWater(msg: TelegramBot.Message) {
    const userId = msg.from?.id;
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
    const userId = msg.from?.id;
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
      if (response.audioSearchTerm) {
        const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
        if (button?.audioUrl) {
          await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
        }
      }
    } catch (error) {
      console.error('Erro no showWeekly:', error);
      await this.bot.sendMessage(chatId, '❌ Erro ao processar resumo semanal.');
    }
  }
}
