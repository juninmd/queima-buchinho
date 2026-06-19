import TelegramBot from 'node-telegram-bot-api';
import { habitsService } from '../services/habits.service';
import { metricsService } from '../services/metrics.service';
import { workoutService } from '../services/workout.service';
import { ollamaService } from '../services/ollama.service';
import { mikaService } from '../services/mika.service';
import { mediaService } from '../services/media.service';
import { HABITS, getProgressBar } from '../config/habits';
import { logger } from '../utils/logger';
import { sendGifMessage } from '../utils/telegram';
import { DIET_PLAN } from '../config/diet';
import { GYM_PLAN } from '../config/gym';
import { getBrasiliaDayName } from '../utils/time';
import { WATER_GOAL_ML } from '../config/constants';
import { escapeHtml } from '../utils/html';

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
      if (cleanText === '/ficha') return this.showGym(msg.chat.id);
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

  public async sendGoodMorningMenu(chatId: number, userId: number) {
    const dayName = getBrasiliaDayName();
    const greeting = `☀️ <b>Bom dia, Mestre!</b>\n` +
      `Hoje é <b>${dayName}</b> — dia novo, buchinho a menos. Bora pra cima! 🔥`;
    const { text, keyboard } = await this.buildMenuContent(userId);
    await this.bot.sendMessage(chatId, `${greeting}\n\n${text}`, {
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
    const [status, water, { completed, total }, streak] = await Promise.all([
      habitsService.getStatus(userId),
      metricsService.getTodaySum(userId, 'water'),
      habitsService.getCompletedCount(userId),
      workoutService.getStreak(userId)
    ]);
    const bar = getProgressBar(completed, total);
    const waterPct = Math.min(100, Math.round((water / WATER_GOAL_ML) * 100));

    let text = `<b>🔥 QUEIMA BUCHINHO — MENU DO DIA 🔥</b>\n`;
    text += `<i>${getBrasiliaDayName()}</i>\n`;
    text += `──────────────────────\n`;
    text += `📊 <b>Hábitos:</b> ${completed}/${total}\n`;
    text += `<code>${bar}</code>\n`;
    text += `💧 <b>Água:</b> ${water}ml / ${WATER_GOAL_ML}ml (${waterPct}%)\n`;
    if (streak > 0) {
      const flame = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : '🔥';
      text += `${flame} <b>Streak:</b> ${streak} dia${streak > 1 ? 's' : ''} seguido${streak > 1 ? 's' : ''}!\n`;
    }
    text += `──────────────────────\n`;
    text += `Toque pra marcar o que já fez hoje 👇`;

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
      { text: '🏋️ Ficha', callback_data: 'show_gym' }
    ]);
    rows.push([
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
/semana - Relatório semanal (Mika tóxica 😈)

<b>💧 Métricas:</b>
/agua - Registrar água (com botões)
/peso <valor> - Registrar peso (kg)
/altura <valor> - Registrar altura (cm)
/gordura <valor> - % de gordura corporal
/musculo <valor> - % de massa muscular
/passos <valor> - Registrar passos do dia

<b>💪 Treino:</b>
Treino e cardio: registre pelos botoes do /menu
/checktreino - Verificação manual
/cardio - Mostra aviso para usar o botao
/streak - Ver sua sequência de treinos 🔥
/reset - Resetar treino de hoje

<b>🎵 Outros:</b>
/relatorio - Relatório diário com áudio da Mika
/motivar - Áudio motivacional
/instante <termo> - Sons do MyInstants
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
              { text: '🥛 +250ml', callback_data: 'add_water_250' },
              { text: '🥤 +500ml', callback_data: 'add_water_500' }
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
        throw new Error('Mika LLM response unavailable');
      }

      const wE = summary.current.metrics.water >= summary.previous.metrics.water ? '📈' : '📉';
      const tE = summary.current.workouts >= summary.previous.workouts ? '📈' : '📉';

      let report = `📊 <b>Resumo da Semana</b>\n`;
      report += `Comparando com a semana passada, Mestre:\n\n`;
      report += `💪 Treinos: ${summary.current.workouts} vs ${summary.previous.workouts} ${tE}\n`;
      report += `💧 Água: ${summary.current.metrics.water}ml vs ${summary.previous.metrics.water}ml ${wE}\n\n`;
      report += `🗣️ <b>Mika diz:</b> ${escapeHtml(response.message)}`;

      const trendUp = summary.current.workouts >= summary.previous.workouts;
      await sendGifMessage(this.bot, chatId, await mediaService.getRandomGif(trendUp ? 'trophy' : 'fail'));
      await this.bot.sendMessage(chatId, report, { parse_mode: 'HTML' });
      // Texto apenas: áudio fica reservado ao relatório final.
    } catch (error) {
      logger.error('Erro no showWeekly:', error);
      await this.bot.sendMessage(chatId, '❌ Erro ao processar resumo semanal.');
    }
  }

  public async showDiet(chatId: number) {
    const dayName = getBrasiliaDayName();
    const diet = DIET_PLAN[dayName] || DIET_PLAN['segunda-feira'];

    let report = `🥗 <b>Cardápio de hoje — ${dayName}</b>\n`;
    report += `Seu mapa pra não cair na besteira 😏\n\n`;
    report += `🍳 <b>Café da manhã</b>\n${diet.cafe}\n\n`;
    report += `☕ <b>Café da tarde</b>\n${diet.cafe_tarde}\n\n`;
    report += `🍽️ <b>Almoço</b>\n${diet.almoco}\n\n`;
    report += `🌙 <b>Jantar</b>\n${diet.jantar}\n\n`;
    const response = await mikaService.response('Diga uma frase curta para seguir o cardapio de hoje, no tom da Mika.');
    report += `<i>${escapeHtml(response.message)}</i>`;

    await this.bot.sendMessage(chatId, report, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🍳 Café feito', callback_data: 'meal_done_cafe' },
            { text: '🍽️ Almoço feito', callback_data: 'meal_done_almoco' },
            { text: '🌙 Jantar feito', callback_data: 'meal_done_jantar' },
          ]
        ]
      }
    });
  }

  public async showGym(chatId: number) {
    const dayName = getBrasiliaDayName();
    const day = GYM_PLAN[dayName] || GYM_PLAN['segunda-feira'];

    let report = `${day.emoji} <b>Ficha de hoje — ${day.muscleGroup}</b>\n`;
    report += `<i>${day.focus}</i>\n\n`;

    if (day.rest) {
      const response = await mikaService.response('Hoje e dia de descanso. Explique curto que recuperacao faz parte do treino, no tom da Mika.');
      report += `${escapeHtml(response.message)}\n\n`;
    }

    for (const ex of day.exercises) {
      report += `• <b>${ex.name}</b> — ${ex.sets}\n`;
    }

    if (!day.rest) {
      const response = await mikaService.response(`Hoje o treino e ${day.muscleGroup}. Mande uma frase curta para ir treinar, no tom da Mika.`);
      report += `\n<i>${escapeHtml(response.message)}</i>`;
    }

    await this.bot.sendMessage(chatId, report, { parse_mode: 'HTML' });
  }
}
