import type { CallbackQuery } from 'node-telegram-bot-api';
import { FichaController } from '../../src/features/ficha/ficha.controller';
import { fichaService } from '../../src/features/ficha/ficha.service';
import { buildFicha, getPlanForDay } from '../../src/features/ficha/generator';
import { habitsService } from '../../src/services/habits.service';
import { workoutService } from '../../src/services/workout.service';

jest.mock('../../src/features/ficha/ficha.service', () => ({
  fichaService: {
    buildToday: jest.fn(), adjustLoad: jest.fn(), saveSession: jest.fn(),
    completeToday: jest.fn(), completeCardio: jest.fn(),
  },
}));
jest.mock('../../src/services/habits.service', () => ({ habitsService: { getStatus: jest.fn() } }));
jest.mock('../../src/services/workout.service', () => ({ workoutService: { hasLoggedToday: jest.fn() } }));

const ficha = () => buildFicha(getPlanForDay('segunda-feira')!, new Map([['agacho_barra', 30]]), '2026-09-07');
const q = (data: string): CallbackQuery =>
  ({ id: 'cb1', data, from: { id: 7 }, message: { chat: { id: -100 }, message_id: 55 } } as any);

describe('FichaController', () => {
  let bot: any;
  let controller: FichaController;

  beforeEach(() => {
    jest.clearAllMocks();
    bot = {
      answerCallbackQuery: jest.fn().mockResolvedValue(true),
      editMessageReplyMarkup: jest.fn().mockResolvedValue(true),
      editMessageText: jest.fn().mockResolvedValue(true),
    };
    controller = new FichaController(bot);
    (fichaService.buildToday as jest.Mock).mockResolvedValue(ficha());
    (workoutService.hasLoggedToday as jest.Mock).mockResolvedValue(false);
    (habitsService.getStatus as jest.Mock).mockResolvedValue({ cardio: false });
  });

  it('só assume os callbacks com prefixo fx:', () => {
    expect(FichaController.handles('fx:done')).toBe(true);
    expect(FichaController.handles('habit_treino')).toBe(false);
    expect(FichaController.handles('mark_trained')).toBe(false);
  });

  it('registra o treino nas tabelas do bot e marca o botão como feito', async () => {
    await controller.handle(q('fx:done'));
    expect(fichaService.completeToday).toHaveBeenCalledWith(7);
    const [{ inline_keyboard }] = (bot.editMessageReplyMarkup as jest.Mock).mock.calls[0];
    expect(inline_keyboard[0][0].text).toContain('✅');
  });

  it('registra o cárdio da esteira/bicicleta', async () => {
    await controller.handle(q('fx:cardio'));
    expect(fichaService.completeCardio).toHaveBeenCalledWith(7);
    const [{ inline_keyboard }] = (bot.editMessageReplyMarkup as jest.Mock).mock.calls[0];
    expect(inline_keyboard[0][1].text).toContain('✅');
  });

  it('abre o seletor de carga sem reescrever o texto da ficha', async () => {
    await controller.handle(q('fx:loads'));
    expect(bot.editMessageReplyMarkup).toHaveBeenCalled();
    expect(bot.editMessageText).not.toHaveBeenCalled();
  });

  it('aplica o ajuste de carga e atualiza o card com o valor novo', async () => {
    (fichaService.adjustLoad as jest.Mock).mockResolvedValue(32.5);
    (fichaService.buildToday as jest.Mock)
      .mockResolvedValueOnce(ficha())
      .mockResolvedValueOnce(buildFicha(getPlanForDay('segunda-feira')!, new Map([['agacho_barra', 32.5]]), '2026-09-07'));

    await controller.handle(q('fx:adj:0:2.5'));

    expect(fichaService.adjustLoad).toHaveBeenCalledWith(7, 'agacho_barra', 30, 2.5);
    const [texto] = (bot.editMessageText as jest.Mock).mock.calls[0];
    expect(texto).toContain('32,5 kg');
    expect(fichaService.saveSession).toHaveBeenCalled();
  });

  it('recusa ajuste em exercício sem carga em vez de gravar lixo', async () => {
    const iPrancha = ficha().exercicios.findIndex(e => e.key === 'prancha');
    await controller.handle(q(`fx:adj:${iPrancha}:5`));
    expect(fichaService.adjustLoad).not.toHaveBeenCalled();
    expect(bot.answerCallbackQuery).toHaveBeenCalledWith('cb1', { text: 'Ajuste inválido.' });
  });

  it('recusa índice fora da ficha', async () => {
    await controller.handle(q('fx:adj:99:5'));
    expect(fichaService.adjustLoad).not.toHaveBeenCalled();
  });

  it('não quebra em dia de descanso', async () => {
    (fichaService.buildToday as jest.Mock).mockResolvedValue(null);
    await controller.handle(q('fx:done'));
    expect(fichaService.completeToday).not.toHaveBeenCalled();
    expect(bot.answerCallbackQuery).toHaveBeenCalledWith('cb1', { text: 'Hoje é descanso. Vá dormir.' });
  });
});
