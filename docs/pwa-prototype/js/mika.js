const WAVE = [8, 14, 22, 12, 18, 26, 16, 10, 20, 24, 14, 8, 18, 22, 12, 16];
function bubble(m) {
  if (m.audio) return `<div class="b mk audio"><span class="play">${ico('play')}</span><div><div class="wave">${WAVE.map(h => `<i style="height:${h}px"></i>`).join('')}</div><span class="sub">${m.label || 'motivacao-mika.mp3'} · 0:07</span></div></div>`;
  if (m.media) return `<div class="b mk"><div class="media" role="img" aria-label="Mídia de exemplo">${m.media}</div></div>`;
  return `<div class="b ${m.me ? 'me' : 'mk'}">${m.t}</div>`;
}
function scrMika() {
  const chips = [['motivar', '🎙️ Motivar'], ['cantada', '💘 Cantada'], ['meme', '🖼️ Meme'], ['gif', '🎞️ GIF'], ['sticker', '✨ Sticker'], ['instante', '🔊 Instante']];
  return `
  <header class="top"><div><p class="eyebrow">Ácida, mas fofa</p><h1>Mika</h1></div><span class="avatar">M</span></header>
  <div class="chat" aria-live="polite">${S.chat.map(bubble).join('')}</div>
  <div class="composer">
    <div class="chips">${chips.map(([k, l]) => `<button data-act="chip" data-arg="${k}">${l}</button>`).join('')}</div>
    <form class="ql" data-form="chat"><label for="msg" hidden>Mensagem para a Mika</label><input id="msg" name="msg" placeholder="Fala com a Mika" autocomplete="off"><button class="btn primary" aria-label="Enviar">${ico('send')}</button></form>
  </div>`;
}
