import type { InlineKeyboardButton, InputMedia } from 'node-telegram-bot-api';
import { escapeHtml } from '../../utils/html';
import { cardioIndex } from './generator';
import type { Ficha, FichaExercise } from './types';

/** Telegram aceita no máximo 10 mídias por álbum; a ficha tem 7 (6 + cárdio). */
const MAX_ALBUM = 10;

export const formatKg = (kg: number): string =>
  `${kg.toFixed(1).replace('.0', '').replace('.', ',')} kg`;

const linhaCarga = (ex: FichaExercise): string =>
  ex.cargaKg === null ? '' : ` · ⚖️ ${formatKg(ex.cargaKg)}`;

function linhaExercicio(ex: FichaExercise, i: number, isCardio: boolean): string {
  const cabeca = `${i + 1}. <b>${escapeHtml(ex.nome)}</b>\n    🏗 ${escapeHtml(ex.aparelho)}`;
  if (isCardio) return `${cabeca}\n    ⏱ ${escapeHtml(ex.reps)}`;
  return `${cabeca}\n    🔁 ${ex.series}x${escapeHtml(ex.reps)}${linhaCarga(ex)} · 😮‍💨 ${ex.descansoS} s`;
}

/** Texto completo da ficha. `provocacao` é a única parte escrita pelo LLM. */
export function renderFicha(ficha: Ficha, provocacao?: string): string {
  const iCardio = cardioIndex(ficha);
  const corpo = ficha.exercicios
    .map((ex, i) => (i === iCardio ? `\n🏃 <b>Cárdio (depois da musculação)</b>\n` : '') + linhaExercicio(ex, i, i === iCardio))
    .join('\n');
  const rodape = provocacao ? `\n\n<i>${escapeHtml(provocacao)}</i>` : '';
  return `${ficha.emoji} <b>${escapeHtml(ficha.titulo)}</b>\n<i>${escapeHtml(ficha.foco)}</i>\n🧩 ${escapeHtml(ficha.metodo)}\n\n${corpo}${rodape}`;
}

/** Álbum de fotos: uma imagem por exercício, com o nome do aparelho na legenda. */
export function renderAlbum(ficha: Ficha): InputMedia[] {
  const iCardio = cardioIndex(ficha);
  return ficha.exercicios.slice(0, MAX_ALBUM).map((ex, i) => ({
    type: 'photo',
    media: ex.img,
    caption: linhaExercicio(ex, i, i === iCardio),
    parse_mode: 'HTML',
  })) as InputMedia[];
}

export function mainKeyboard(trained: boolean, cardioDone: boolean): InlineKeyboardButton[][] {
  return [
    [
      { text: trained ? '🏋️‍♂️ Treino feito! ✅' : '🏋️‍♂️ Treinei', callback_data: 'fx:done' },
      { text: cardioDone ? '🏃 Cárdio feito! ✅' : '🏃 Fiz o cárdio', callback_data: 'fx:cardio' },
    ],
    [{ text: '⚖️ Ajustar carga', callback_data: 'fx:loads' }],
  ];
}

/** Lista só os exercícios com carga ajustável — cárdio e peso do corpo ficam de fora. */
export function loadPickerKeyboard(ficha: Ficha): InlineKeyboardButton[][] {
  const rows = ficha.exercicios.reduce<InlineKeyboardButton[][]>((acc, ex, i) => {
    if (ex.cargaKg === null) return acc;
    const btn = { text: `${ex.nome.slice(0, 22)} · ${formatKg(ex.cargaKg)}`, callback_data: `fx:pick:${i}` };
    if (acc.length === 0 || acc[acc.length - 1].length === 2) acc.push([btn]);
    else acc[acc.length - 1].push(btn);
    return acc;
  }, []);
  return [...rows, [{ text: '⬅️ Voltar', callback_data: 'fx:back' }]];
}

export function stepperKeyboard(index: number, ex: FichaExercise): InlineKeyboardButton[][] {
  return [
    [
      { text: '−5', callback_data: `fx:adj:${index}:-5` },
      { text: '−2,5', callback_data: `fx:adj:${index}:-2.5` },
      { text: formatKg(ex.cargaKg ?? 0), callback_data: 'fx:noop' },
      { text: '+2,5', callback_data: `fx:adj:${index}:2.5` },
      { text: '+5', callback_data: `fx:adj:${index}:5` },
    ],
    [{ text: '⬅️ Voltar', callback_data: 'fx:loads' }],
  ];
}
