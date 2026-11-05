import TelegramBot from 'node-telegram-bot-api';
import type { CallbackQuery } from 'node-telegram-bot-api';
import { logger } from '../../utils/logger';
import { fichaService } from './ficha.service';
import { refreshCard, setKeyboard } from './card';
import { loadPickerKeyboard, prontosParaSubir, renderFicha, stepperKeyboard } from './render';
import { progressionService } from './progression.service';
import { getBrasiliaDateString } from '../../utils/time';
import type { Ficha } from './types';

export const FICHA_CALLBACK_PREFIX = 'fx:';

export class FichaController {
  constructor(private bot: TelegramBot) {}

  public static handles(data: string): boolean {
    return data.startsWith(FICHA_CALLBACK_PREFIX);
  }

  public async handle(query: CallbackQuery): Promise<void> {
    const data = query.data ?? '';
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const userId = query.from.id;
    if (!chatId || !messageId) return this.answer(query);

    // A ficha é reconstruída a cada toque: uma leitura de cargas resolve o estado atual
    // sem depender do texto do card, que pode estar defasado por outra sessão.
    const ficha = await fichaService.buildToday(userId);
    if (!ficha) return this.answer(query, 'Hoje é descanso. Vá dormir.');

    const [, action, rawIndex, rawDelta] = data.split(':');
    if (action === 'done') return this.markDone(query, userId, chatId, messageId);
    if (action === 'prog') return this.applyProgression(query, userId, chatId, messageId, ficha);
    if (action === 'deload') return this.startDeload(query, userId, chatId, messageId);
    if (action === 'cardio') return this.markCardio(query, userId, chatId, messageId);
    if (action === 'loads') return this.showPicker(query, chatId, messageId, ficha);
    if (action === 'back') return this.showMain(query, userId, chatId, messageId);
    if (action === 'pick') return this.showStepper(query, chatId, messageId, ficha, Number(rawIndex));
    if (action === 'adj') return this.adjust(query, userId, chatId, messageId, ficha, Number(rawIndex), Number(rawDelta));
    return this.answer(query);
  }

  private async answer(query: CallbackQuery, text?: string): Promise<void> {
    await this.bot.answerCallbackQuery(query.id, text ? { text } : undefined).catch(() => {});
  }

  /**
   * Sobe de uma vez todos os exercícios que repetiram carga. A semente é `cargaBaseKg`
   * quando existe: no deload a ficha mostra carga reduzida, e persistir esse valor
   * transformaria a semana leve em regressão permanente.
   */
  private async applyProgression(
    query: CallbackQuery, userId: number, chatId: number, messageId: number, ficha: Ficha
  ): Promise<void> {
    const itens = prontosParaSubir(ficha).map(ex => ({
      key: ex.key,
      cargaKg: (ex.cargaBaseKg ?? ex.cargaKg) as number,
    }));
    const subidos = await progressionService.bumpLoads(userId, itens);
    if (subidos.length === 0) return this.answer(query, 'Nada para subir ainda.');
    await this.answer(query, `⬆️ ${subidos.length} exercícios mais pesados. Sem choro.`);
    await refreshCard(this.bot, userId, chatId, messageId);
  }

  private async startDeload(
    query: CallbackQuery, userId: number, chatId: number, messageId: number
  ): Promise<void> {
    const ate = await progressionService.startDeload(userId, getBrasiliaDateString());
    if (!ate) return this.answer(query, 'Não consegui ativar a semana leve.');
    await this.answer(query, `😮‍💨 Semana leve até ${ate}. Descanso é treino também.`);
    await refreshCard(this.bot, userId, chatId, messageId);
  }

  private async markDone(query: CallbackQuery, userId: number, chatId: number, messageId: number): Promise<void> {
    await fichaService.completeToday(userId);
    await this.answer(query, '🏋️‍♂️ Treino registrado!');
    await refreshCard(this.bot, userId, chatId, messageId);
  }

  private async markCardio(query: CallbackQuery, userId: number, chatId: number, messageId: number): Promise<void> {
    await fichaService.completeCardio(userId);
    await this.answer(query, '🏃 Cárdio registrado!');
    await refreshCard(this.bot, userId, chatId, messageId);
  }

  private async showMain(query: CallbackQuery, userId: number, chatId: number, messageId: number): Promise<void> {
    await this.answer(query);
    await refreshCard(this.bot, userId, chatId, messageId);
  }

  private async showPicker(query: CallbackQuery, chatId: number, messageId: number, ficha: Ficha): Promise<void> {
    await this.answer(query, '⚖️ Escolha o exercício');
    await setKeyboard(this.bot, chatId, messageId, loadPickerKeyboard(ficha));
  }

  private async showStepper(
    query: CallbackQuery, chatId: number, messageId: number, ficha: Ficha, index: number
  ): Promise<void> {
    const ex = ficha.exercicios[index];
    if (!ex || ex.cargaKg === null) return this.answer(query, 'Esse exercício não tem carga.');
    await this.answer(query, ex.nome);
    await setKeyboard(this.bot, chatId, messageId, stepperKeyboard(index, ex));
  }

  private async adjust(
    query: CallbackQuery, userId: number, chatId: number, messageId: number,
    ficha: Ficha, index: number, deltaKg: number
  ): Promise<void> {
    const ex = ficha.exercicios[index];
    if (!ex || ex.cargaKg === null || !Number.isFinite(deltaKg)) {
      return this.answer(query, 'Ajuste inválido.');
    }

    const novaCarga = await fichaService.adjustLoad(userId, ex.key, ex.cargaKg, deltaKg);
    await this.answer(query, `${ex.nome}: ${novaCarga} kg`);

    const atualizada = await fichaService.buildToday(userId);
    if (!atualizada) return;
    await fichaService.saveSession(userId, atualizada);
    try {
      await this.bot.editMessageText(renderFicha(atualizada), {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: stepperKeyboard(index, atualizada.exercicios[index]) },
      });
    } catch (e) {
      logger.warn('Não foi possível atualizar o card da ficha', { erro: String(e) });
    }
  }
}
