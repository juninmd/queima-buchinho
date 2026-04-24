import TelegramBot from 'node-telegram-bot-api';
import { habitsService } from '../services/habits.service';
import { metricsService } from '../services/metrics.service';
import { ollamaService } from '../services/ollama.service';
import { memeService } from '../services/meme.service';
import { myInstantsService } from '../services/myinstants.service';
import { workoutService } from '../services/workout.service';
import { HABIT_MAP } from '../config/habits';
import { MenuController } from './menu.controller';
import { sendAudioMessage } from '../utils/telegram';
import { logger } from '../utils/logger';
import { BOT_MESSAGES } from '../config/constants';

export class HabitsController {
  constructor(private bot: TelegramBot, private menuController: MenuController) {}

  public init() {
    this.bot.on('callback_query', (query) => {
      logger.info(`🖱️ [DEBUG-INDEX] Callback Global: Data=${query.data}, ID=${query.id}`);
      this.handleCallback(query).catch(err => logger.error('❌ Erro fatal no handleCallback:', err));
    });
  }

  private async handleCallback(query: TelegramBot.CallbackQuery) {
    const userId = query.from.id;
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const data = query.data;

    logger.info(`🖱️ [HabitsController] Processando callback: "${data}" | User: ${userId} | Chat: ${chatId} | ID: ${query.id}`);

    if (!chatId || !data) {
      logger.warn(`⚠️ [HabitsController] Callback ignorado: chatId=${chatId}, data=${data}`);
      await this.bot.answerCallbackQuery(query.id).catch(() => {});
      return;
    }

    try {
      let handled = false;

      if (data.startsWith('habit_')) {
        await this.handleHabitToggle(query, userId, chatId, messageId);
        handled = true;
      } else if (data.startsWith('add_water_')) {
        await this.handleWaterAdd(query, userId, chatId, messageId);
        handled = true;
      } else if (data === 'mark_trained') {
        await this.handleMarkTrained(query, userId, chatId, messageId);
        handled = true;
      } else if (data === 'mark_cardio') {
        await this.handleMarkCardio(query, userId, chatId, messageId);
        handled = true;
      } else if (data === 'refresh_menu') {
        await this.handleRefreshMenu(query, chatId, messageId!, userId);
        handled = true;
      } else if (data === 'weekly_summary') {
        await this.handleWeeklySummary(query, chatId, userId);
        handled = true;
      } else if (data === 'get_motivation') {
        await this.handleMotivation(query, chatId);
        handled = true;
      } else if (data === 'show_diet') {
        await this.handleShowDiet(query, chatId);
        handled = true;
      } else if (data.startsWith('meal_done_')) {
        await this.handleMealDone(query, userId, chatId);
        handled = true;
      }

      if (!handled) {
        logger.warn(`⚠️ [HabitsController] Callback não reconhecido: ${data}`);
        await this.bot.answerCallbackQuery(query.id).catch(() => {});
      }
    } catch (error) {
      logger.error(`❌ [HabitsController] Erro ao processar callback ${data}:`, error);
      await this.bot.answerCallbackQuery(query.id, {
        text: '❌ Erro ao processar. Tente novamente!',
        show_alert: true
      }).catch(() => {});
    }
  }

  private async handleHabitToggle(
    query: TelegramBot.CallbackQuery, userId: number, chatId: number, messageId?: number
  ) {
    const habitKey = query.data!.replace('habit_', '');
    const habit = HABIT_MAP.get(habitKey);
    
    if (!habit) {
      await this.bot.answerCallbackQuery(query.id, { text: '❌ Hábito não encontrado.' }).catch(() => {});
      return;
    }

    const newValue = await habitsService.toggleHabit(userId, habitKey);

    if (habitKey === 'treino' && newValue) {
      await workoutService.logWorkout(userId, true, 'Menu button');
    }

    const statusEmoji = newValue ? '✅' : '❌';
    await this.bot.answerCallbackQuery(query.id, {
      text: `${habit.emoji} ${habit.label} ${statusEmoji}`
    }).catch(() => {});

    if (messageId) {
      await this.menuController.refreshMenu(chatId, messageId, userId);
    }

    if (newValue) {
      const response = await ollamaService.getHabitResponse(habitKey);
      if (response) await this.bot.sendMessage(chatId, response.message);
    }
  }

  private async handleWaterAdd(
    query: TelegramBot.CallbackQuery, userId: number, chatId: number, messageId?: number
  ) {
    const amount = parseInt(query.data!.replace('add_water_', ''));
    await metricsService.logMetric(userId, 'water', amount, 'ml');
    const total = await metricsService.getTodaySum(userId, 'water');

    await this.bot.answerCallbackQuery(query.id, {
      text: `💧 +${amount}ml! Total: ${total}ml`
    }).catch(() => {});

    if (messageId) {
      await this.menuController.refreshMenu(chatId, messageId, userId);
    }

    const response = await ollamaService.getWaterSuccess(total);
    if (response) await this.bot.sendMessage(chatId, response.message);
  }

  private async handleMarkTrained(
    query: TelegramBot.CallbackQuery, userId: number, chatId: number, messageId?: number
  ) {
    await workoutService.logWorkout(userId, true, 'Button click');
    await habitsService.markHabit(userId, 'treino', true);

    await this.bot.answerCallbackQuery(query.id, { text: '🏋️‍♂️ Treino registrado!' }).catch(() => {});

    const congrats = await memeService.getCongratsMessage();
    await this.bot.sendMessage(chatId, congrats.message);

    if (congrats.audioSearchTerm) {
      const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);
      if (button?.audioUrl) {
        await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
      }
    }

    if (messageId) {
      try {
        await this.bot.editMessageReplyMarkup(
          { inline_keyboard: [] }, { chat_id: chatId, message_id: messageId }
        );
      } catch (_) {}
    }
  }

  private async handleMarkCardio(
    query: TelegramBot.CallbackQuery, userId: number, chatId: number, messageId?: number
  ) {
    await habitsService.markHabit(userId, 'cardio', true);

    await this.bot.answerCallbackQuery(query.id, { text: '🏃 Cárdio registrado!' }).catch(() => {});

    const response = await ollamaService.getHabitResponse('cardio');
    if (response) await this.bot.sendMessage(chatId, response.message);

    if (messageId) {
      try {
        await this.bot.editMessageReplyMarkup(
          { inline_keyboard: [] }, { chat_id: chatId, message_id: messageId }
        );
      } catch (_) {}
    }
  }

  private async handleRefreshMenu(
    query: TelegramBot.CallbackQuery, chatId: number, messageId: number, userId: number
  ) {
    await this.bot.answerCallbackQuery(query.id, { text: '🔄 Atualizando...' }).catch(() => {});
    await this.menuController.refreshMenu(chatId, messageId, userId);
  }

  private async handleWeeklySummary(
    query: TelegramBot.CallbackQuery, chatId: number, userId: number
  ) {
    await this.bot.answerCallbackQuery(query.id, { text: '📊 Gerando resumo...' }).catch(() => {});
    const fakeMsg = { chat: { id: chatId }, from: { id: userId } } as TelegramBot.Message;
    await this.menuController.showWeekly(fakeMsg);
  }
  
  private async handleMotivation(
    query: TelegramBot.CallbackQuery, chatId: number
  ) {
    await this.bot.answerCallbackQuery(query.id, { text: '🚀 Buscando motivação...' }).catch(() => {});
    const audio = memeService.getMotivationAudio();
    await sendAudioMessage(this.bot, chatId, audio, BOT_MESSAGES.MOTIVATION_CAPTION);
  }

  private async handleMealDone(
    query: TelegramBot.CallbackQuery, userId: number, chatId: number
  ) {
    const meal = query.data!.replace('meal_done_', '');
    await habitsService.markHabit(userId, meal, true);
    const habit = HABIT_MAP.get(meal);
    await this.bot.answerCallbackQuery(query.id, {
      text: `${habit?.emoji || '✅'} ${habit?.label || meal} marcado!`
    }).catch(() => {});
    await this.bot.sendMessage(chatId, `${habit?.emoji || '✅'} ${habit?.label || meal} registrado!`);
  }

  private async handleShowDiet(query: TelegramBot.CallbackQuery, chatId: number) {
    await this.bot.answerCallbackQuery(query.id).catch(() => {});
    await this.menuController.showDiet(chatId);
  }
}
