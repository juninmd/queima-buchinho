import TelegramBot from 'node-telegram-bot-api';
import { habitsService } from '../services/habits.service';
import { metricsService } from '../services/metrics.service';
import { mikaService } from '../services/mika.service';
import { workoutService } from '../services/workout.service';
import { mediaService } from '../services/media.service';
import { HABIT_MAP } from '../config/habits';
import { MenuController } from './menu.controller';
import { sendMika, sendGifMessage } from '../utils/telegram';
import { logger } from '../utils/logger';
import { getMikaContext, getMealTimeComment } from '../utils/time';

export class HabitsController {
  constructor(private bot: TelegramBot, private menuController: MenuController) {}

  public init() {
    this.bot.on('callback_query', (query) => {
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
      } else if (data === 'show_gym') {
        await this.bot.answerCallbackQuery(query.id);
        await this.menuController.showGym(chatId);
        handled = true;
      } else if (data.startsWith('meal_done_')) {
        await this.handleMealDone(query, userId, chatId);
        handled = true;
      }

      if (!handled) {
        logger.warn(`⚠️ [HabitsController] Callback não reconhecido: ${data}`);
        await this.bot.answerCallbackQuery(query.id).catch(() => {});
      }
    } catch (error: any) {
      logger.error(`❌ [HabitsController] Erro ao processar callback ${data}:`, error);
      const errorMessage = error.message || 'Erro desconhecido';
      
      // Responde ao callback para tirar o loading do botão
      await this.bot.answerCallbackQuery(query.id, {
        text: `❌ Erro: ${errorMessage.substring(0, 50)}`,
        show_alert: true
      }).catch(() => {});

      // Envia mensagem detalhada se possível
      if (chatId) {
        await this.bot.sendMessage(chatId, `💥 **Erro no Queima Buchinho!**\n\n` +
          `Parece que algo quebrou enquanto eu tentava processar seu clique em \`${data}\`.\n\n` +
          `**Erro:** \`${errorMessage}\`\n\n` +
          `_Tente novamente ou dê um grito no suporte!_`, { parse_mode: 'Markdown' }).catch(() => {});
      }
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

    if (habitKey === 'treino') {
      if (newValue) {
        await workoutService.logWorkout(userId, true, 'Menu button');
      } else {
        await workoutService.resetWorkout(userId);
      }
    }

    const statusEmoji = newValue ? '✅' : '❌';
    await this.bot.answerCallbackQuery(query.id, {
      text: `${habit.emoji} ${habit.label} ${statusEmoji}`
    }).catch(() => {});

    if (messageId) {
      await this.menuController.refreshMenu(chatId, messageId, userId);
    }

    // Treino não dispara resposta (texto/áudio/GIF): só atualiza o ✅ do menu e o relatório final.
    if (newValue && habitKey !== 'treino') {
      const ctx = getMikaContext();
      const response = await mikaService.response(`${ctx} O Mestre marcou o habito "${habit.label}". Reaja curto, natural e sarcastico, mencionando o horario se for relevante (ex: dormir cedo tarde, suplemento a noite, etc).`);
      await sendMika(this.bot, chatId, response);
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
    // Água não dispara resposta (texto/áudio/GIF): só o toast do botão, o ✅ do menu e o relatório final.
  }

  /**
   * Atualiza no card o botão que acabou de ser tocado para o estado "feito ✅",
   * preservando os demais botões (refeições, água, cárdio). Antes a gente apagava
   * o teclado inteiro — o que sumia com os outros botões e não confirmava a ação.
   */
  private async flipButtonDone(
    query: TelegramBot.CallbackQuery, chatId: number, messageId: number, callbackData: string, doneText: string
  ) {
    const keyboard = query.message?.reply_markup?.inline_keyboard;
    if (!keyboard) return;
    const updated = keyboard.map(row =>
      row.map(btn => btn.callback_data === callbackData ? { ...btn, text: doneText } : btn)
    );
    try {
      await this.bot.editMessageReplyMarkup(
        { inline_keyboard: updated }, { chat_id: chatId, message_id: messageId }
      );
    } catch (_) {}
  }

  private async handleMarkTrained(
    query: TelegramBot.CallbackQuery, userId: number, chatId: number, messageId?: number
  ) {
    await workoutService.logWorkout(userId, true, 'Button click');
    await habitsService.markHabit(userId, 'treino', true);

    await this.bot.answerCallbackQuery(query.id, { text: '🏋️‍♂️ Treino registrado!' }).catch(() => {});

    if (messageId) {
      await this.flipButtonDone(query, chatId, messageId, 'mark_trained', '🏋️‍♂️ Treino feito! ✅');
    }
    // Sem resposta (texto/áudio/GIF): só o ✅ no botão/menu e o relatório final.
  }

  private async handleMarkCardio(
    query: TelegramBot.CallbackQuery, userId: number, chatId: number, messageId?: number
  ) {
    await habitsService.markHabit(userId, 'cardio', true);

    await this.bot.answerCallbackQuery(query.id, { text: '🏃 Cárdio registrado!' }).catch(() => {});

    if (messageId) {
      await this.flipButtonDone(query, chatId, messageId, 'mark_cardio', '🏃 Cárdio feito! ✅');
    }

    await sendGifMessage(this.bot, chatId, await mediaService.getRandomGif('cardio'));
    const ctx = getMikaContext();
    const response = await mikaService.response(`${ctx} O Mestre marcou cardio concluido. Reaja curto, natural e sarcastico — se o horario for estranho (ex: cardio a noite tarde ou de manha cedo), comente.`);
    await sendMika(this.bot, chatId, response);
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
    const ctx = getMikaContext();
    const response = await mikaService.response(`${ctx} Mande uma motivacao curta para o Mestre treinar agora, sarcastica e natural. Se o horario for tarde (ex: 22h), faz comentario ironico mas ainda manda treinar.`);
    await sendMika(this.bot, chatId, response);
  }

  private async handleMealDone(
    query: TelegramBot.CallbackQuery, userId: number, chatId: number
  ) {
    const meal = query.data!.replace('meal_done_', '') as 'cafe' | 'almoco' | 'cafe_tarde' | 'jantar';
    await habitsService.markHabit(userId, meal, true);
    const habit = HABIT_MAP.get(meal);
    await this.bot.answerCallbackQuery(query.id, {
      text: `${habit?.emoji || '✅'} ${habit?.label || meal} marcado!`
    }).catch(() => {});
    await sendGifMessage(this.bot, chatId, await mediaService.getRandomGif('happy'));
    const mealComment = getMealTimeComment(meal);
    const ctx = getMikaContext();
    const response = await mikaService.response(`${ctx} O Mestre marcou "${mealComment}" como feito. Reaja curto e sarcastico — se o horario for inusual para essa refeicao, zoe com isso.`);
    await sendMika(this.bot, chatId, response);
  }

  private async handleShowDiet(query: TelegramBot.CallbackQuery, chatId: number) {
    await this.bot.answerCallbackQuery(query.id).catch(() => {});
    await this.menuController.showDiet(chatId);
  }
}
