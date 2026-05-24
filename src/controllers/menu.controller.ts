import TelegramBot from 'node-telegram-bot-api';
import { habitsService } from '../services/habits.service';
import { metricsService } from '../services/metrics.service';
import { workoutService } from '../services/workout.service';
import { ollamaService } from '../services/ollama.service';
import { mikaService } from '../services/mika.service';
import { myInstantsService } from '../services/myinstants.service';
import { HABITS, getProgressBar } from '../config/habits';
import { logger } from '../utils/logger';
import { ttsService } from '../services/tts.service';
import { sendAudioMessage } from '../utils/telegram';
import { DIET_PLAN } from '../config/diet';
import { GYM_PLAN } from '../config/gym';
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

    let text = `<b>ðŸ”¥ Queima Buchinho - Menu do Dia ðŸ”¥</b>\n\n`;
    text += `Progresso: ${completed}/${total} hÃ¡bitos\n`;
    text += `<code>${bar}</code>\n\n`;
    text += `ðŸ’§ Ãgua hoje: ${water}ml\n`;
    if (streak > 0) {
      const flame = streak >= 7 ? 'ðŸ”¥ðŸ”¥ðŸ”¥' : streak >= 3 ? 'ðŸ”¥ðŸ”¥' : 'ðŸ”¥';
      text += `${flame} Streak: ${streak} dia${streak > 1 ? 's' : ''} seguido${streak > 1 ? 's' : ''}!\n`;
    }
    text += `\nToque para marcar/desmarcar:`;

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
        text: `${h.emoji} ${h.label} ${status[h.key] ? 'âœ…' : 'âŒ'}`,
        callback_data: `habit_${h.key}`
      })));
    }

    rows.push([
      { text: 'ðŸ’§ +250ml', callback_data: 'add_water_250' },
      { text: 'ðŸ’§ +500ml', callback_data: 'add_water_500' },
      { text: 'ðŸ’§ +1L', callback_data: 'add_water_1000' }
    ]);

    rows.push([
      { text: 'ðŸ“Š Semana', callback_data: 'weekly_summary' },
      { text: 'ðŸ½ï¸ CardÃ¡pio', callback_data: 'show_diet' },
      { text: 'ðŸ‹ï¸ Ficha', callback_data: 'show_gym' }
    ]);
    rows.push([
      { text: 'ðŸš€ Motivar', callback_data: 'get_motivation' }
    ]);

    rows.push([
      { text: 'ðŸ”„ Atualizar', callback_data: 'refresh_menu' }
    ]);

    return rows;
  }

  private async showHelp(msg: TelegramBot.Message) {
    const text = `<b>ðŸ”¥ Queima Buchinho Bot ðŸ”¥</b>

<b>ðŸ“‹ HÃ¡bitos:</b>
/menu - Menu interativo com todos os hÃ¡bitos
/progresso - Ver progresso do dia
/semana - RelatÃ³rio semanal (Mika tÃ³xica ðŸ˜ˆ)

<b>ðŸ’§ MÃ©tricas:</b>
/agua - Registrar Ã¡gua (com botÃµes)
/peso &lt;valor&gt; - Registrar peso (kg)
/altura &lt;valor&gt; - Registrar altura (cm)
/gordura &lt;valor&gt; - % de gordura corporal
/musculo &lt;valor&gt; - % de massa muscular
/passos &lt;valor&gt; - Registrar passos do dia

<b>ðŸ’ª Treino:</b>
Treino e cardio: registre pelos botoes do /menu
/checktreino - VerificaÃ§Ã£o manual
/cardio - Mostra aviso para usar o botao
/streak - Ver sua sequÃªncia de treinos ðŸ”¥
/reset - Resetar treino de hoje

<b>ðŸŽµ Outros:</b>
/relatorio - RelatÃ³rio diÃ¡rio com Ã¡udio da Mika
/motivar - Ãudio motivacional
/instante &lt;termo&gt; - Sons do MyInstants
/hora - HorÃ¡rio de BrasÃ­lia`;

    await this.bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
  }

  private async showWater(msg: TelegramBot.Message) {
    const userId = msg.from?.id || msg.sender_chat?.id;
    if (!userId) return;

    const today = await metricsService.getTodaySum(userId, 'water');
    await this.bot.sendMessage(msg.chat.id,
      `ðŸ’§ <b>Consumo de Ãgua</b>\nTotal de hoje: ${today}ml\n\nEscolha uma quantidade:`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'ðŸ¥¤ +250ml', callback_data: 'add_water_250' },
              { text: 'ðŸ¥› +500ml', callback_data: 'add_water_500' }
            ],
            [{ text: 'ðŸ¼ +1L', callback_data: 'add_water_1000' }]
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
        await this.bot.sendMessage(chatId, 'âŒ Erro ao gerar resumo semanal.');
        return;
      }

      const response = await ollamaService.getWeeklyReport(summary);
      if (!response) {
        throw new Error('Mika LLM response unavailable');
      }

      const wE = summary.current.metrics.water >= summary.previous.metrics.water ? 'ðŸ“ˆ' : 'ðŸ“‰';
      const tE = summary.current.workouts >= summary.previous.workouts ? 'ðŸ“ˆ' : 'ðŸ“‰';

      let report = `ðŸ“Š <b>Resumo Semanal</b>\n\n`;
      report += `ðŸ’ª Treinos: ${summary.current.workouts} vs ${summary.previous.workouts} ${tE}\n`;        
      report += `ðŸ’§ Ãgua: ${summary.current.metrics.water}ml vs ${summary.previous.metrics.water}ml ${wE}\n\n`;
      report += `ðŸ—£ï¸ <b>Mika diz:</b> ${response.message}`;

      await this.bot.sendMessage(chatId, report, { parse_mode: 'HTML' });

      // Gerar e enviar Ã¡udio da Mika
      try {
        const audioPath = await ttsService.generateMikaAudio(response.message);
        await sendAudioMessage(this.bot, chatId, audioPath, `ðŸŽ™ï¸ ComentÃ¡rio da Mika`);
        await ttsService.cleanup(audioPath);
      } catch (error) {
        logger.error('Erro ao gerar Ã¡udio do resumo semanal:', error);
      }

      if (response.audioSearchTerm) {
        const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
        if (button?.audioUrl) {
          await this.bot.sendAudio(chatId, button.audioUrl, { caption: `ðŸŽ¶ ${button.title}` });
        }
      }
    } catch (error) {
      logger.error('Erro no showWeekly:', error);
      await this.bot.sendMessage(chatId, 'âŒ Erro ao processar resumo semanal.');
    }
  }

  public async showDiet(chatId: number) {
    const dayName = getBrasiliaDayName();
    const diet = DIET_PLAN[dayName] || DIET_PLAN['segunda-feira'];

    let report = `ðŸ´ <b>CardÃ¡pio de Hoje (${dayName})</b>\n\n`;
    report += `ðŸ³ <b>CafÃ© da ManhÃ£:</b>\n${diet.cafe}\n\n`;
    report += `ðŸ½ï¸ <b>AlmoÃ§o:</b>\n${diet.almoco}\n\n`;
    report += `ðŸŒ™ <b>Jantar:</b>\n${diet.jantar}\n\n`;
    const response = await mikaService.response('Diga uma frase curta para seguir o cardapio de hoje, no tom da Mika.');
    report += `<i>${response.message}</i>`;

    await this.bot.sendMessage(chatId, report, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'ðŸ³ CafÃ© feito', callback_data: 'meal_done_cafe' },
            { text: 'ðŸ½ï¸ AlmoÃ§o feito', callback_data: 'meal_done_almoco' },
            { text: 'ðŸŒ™ Jantar feito', callback_data: 'meal_done_jantar' },
          ]
        ]
      }
    });
  }

  public async showGym(chatId: number) {
    const dayName = getBrasiliaDayName();
    const day = GYM_PLAN[dayName] || GYM_PLAN['segunda-feira'];

    let report = `${day.emoji} <b>Ficha de Hoje â€” ${day.muscleGroup}</b>\n`;
    report += `<i>${day.focus}</i>\n\n`;

    if (day.rest) {
      const response = await mikaService.response('Hoje e dia de descanso. Explique curto que recuperacao faz parte do treino, no tom da Mika.');
      report += `${response.message}\n\n`;
    }

    for (const ex of day.exercises) {
      report += `â€¢ <b>${ex.name}</b> â€” ${ex.sets}\n`;
    }

    if (!day.rest) {
      const response = await mikaService.response(`Hoje o treino e ${day.muscleGroup}. Mande uma frase curta para ir treinar, no tom da Mika.`);
      report += `\n<i>${response.message}</i>`;
    }

    await this.bot.sendMessage(chatId, report, { parse_mode: 'HTML' });
  }
}
