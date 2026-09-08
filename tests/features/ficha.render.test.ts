import { buildFicha, getPlanForDay } from '../../src/features/ficha/generator';
import {
  formatKg, loadPickerKeyboard, mainKeyboard, renderAlbum, renderFicha, stepperKeyboard,
} from '../../src/features/ficha/render';

const ficha = buildFicha(getPlanForDay('segunda-feira')!, new Map([['agacho_barra', 47.5]]), '2026-09-07');

describe('formatKg', () => {
  it('usa vírgula decimal e some com o zero à direita', () => {
    expect(formatKg(47.5)).toBe('47,5 kg');
    expect(formatKg(30)).toBe('30 kg');
  });
});

describe('renderFicha', () => {
  const texto = renderFicha(ficha, 'Levanta dessa cama.');

  it('mostra nome do exercício, aparelho, séries/repetições e carga', () => {
    expect(texto).toContain('<b>Agachamento livre com barra</b>');
    expect(texto).toContain('Rack de agachamento + barra');
    expect(texto).toContain('3x12-15');
    expect(texto).toContain('47,5 kg');
  });

  it('separa o bloco de cárdio e mostra a duração, sem carga', () => {
    expect(texto).toContain('🏃 <b>Cárdio (depois da musculação)</b>');
    expect(texto).toContain('Esteira — HIIT 1:2 (15 min)');
    expect(texto).toContain('Esteira ergométrica');
  });

  it('escapa a fala da Mika para não quebrar o parse_mode HTML', () => {
    expect(renderFicha(ficha, 'treina <b>agora</b> & pronto')).toContain('treina &lt;b&gt;agora&lt;/b&gt; &amp; pronto');
  });

  it('funciona sem provocação quando o LLM está fora', () => {
    expect(() => renderFicha(ficha)).not.toThrow();
    expect(renderFicha(ficha)).not.toContain('<i></i>');
  });
});

describe('renderAlbum', () => {
  it('manda uma foto por exercício, dentro do limite de 10 do Telegram', () => {
    const album = renderAlbum(ficha);
    expect(album).toHaveLength(7);
    expect(album.length).toBeLessThanOrEqual(10);
    expect(album[0]).toMatchObject({ type: 'photo', parse_mode: 'HTML' });
    expect((album[0] as any).media).toContain('Barbell_Squat');
    // Legenda é o que entrega "nome do aparelho" junto da imagem.
    expect((album[0] as any).caption).toContain('Rack de agachamento + barra');
  });
});

describe('teclados', () => {
  it('o card principal traz treino, cárdio e ajuste de carga', () => {
    const kb = mainKeyboard(false, false);
    const dados = kb.flat().map(b => b.callback_data);
    expect(dados).toEqual(['fx:done', 'fx:cardio', 'fx:loads']);
    expect(mainKeyboard(true, true).flat()[0].text).toContain('✅');
  });

  it('o seletor de carga ignora cárdio e peso do corpo', () => {
    const kb = loadPickerKeyboard(ficha);
    const indices = kb.flat()
      .filter(b => b.callback_data?.startsWith('fx:pick:'))
      .map(b => Number(b.callback_data!.split(':')[2]));
    expect(indices.every(i => ficha.exercicios[i].cargaKg !== null)).toBe(true);
    expect(indices).not.toContain(ficha.exercicios.length - 1);
    expect(kb[kb.length - 1][0].callback_data).toBe('fx:back');
  });

  it('o stepper oferece ±2,5 e ±5 kg e mostra a carga atual', () => {
    const kb = stepperKeyboard(0, ficha.exercicios[0]);
    expect(kb[0].map(b => b.callback_data)).toEqual([
      'fx:adj:0:-5', 'fx:adj:0:-2.5', 'fx:noop', 'fx:adj:0:2.5', 'fx:adj:0:5',
    ]);
    expect(kb[0][2].text).toBe('47,5 kg');
    // callback_data do Telegram é limitado a 64 bytes.
    expect(kb.flat().every(b => Buffer.byteLength(b.callback_data ?? '') <= 64)).toBe(true);
  });
});
