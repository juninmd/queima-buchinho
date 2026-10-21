# mika-video — protótipo

A Mika em **vídeo**, em close do rosto e fundo anime, falando o mesmo áudio do relatório por voz.

```
texto → Edge-TTS (mp3) ─┬─ ffmpeg → PCM 16 kHz → lip-sync por quadro (RMS + formantes → vogais)
                        │                                   │
                        │   Chromium headless (WebGL por software)
                        │   three.js + @pixiv/three-vrm, avançando 1/fps por quadro (sem relógio de parede)
                        │                                   │ JPEG
                        └──────────── ffmpeg (h264 + aac) ◄─┘ → mp4
```

## Rodar

```bash
# precisa de: ffmpeg, Chromium (CHROMIUM_PATH ou /opt/pw-browsers) e o modelo VRM
# MIKA_VRM_PATH (opcional) troca o modelo; o padrão é assets/mika/mika.vrm
bun src/features/mika-video/cli.ts "Texto da Mika" saida.mp4
bun src/features/mika-video/cli.ts --audio relatorio.mp3 saida.mp4
MIKA_VIDEO_STILL=40 bun src/features/mika-video/cli.ts --audio x.mp3 quadro.jpg   # só o quadro 40
```

Do código: `renderMikaVideo({ audioPath, outPath })` (`render.ts`) e depois
`bot.sendVideoNote(chatId, mp4)` (redondo, quadrado ≤ 640 px e ≤ 60 s) ou `bot.sendVideo`.

## O que vem do mika (`stage/vendor/`, `lip-sync-vowels.ts`)

Cópias literais de `juninmd/mika` — piscada (`blink`), visemas por vogal (`mouth`), acabamento MToon
anime (`materials`), carregador de textura e a análise de vogais. Mantenha em sincronia com a origem.
O que **não** veio: o rig de corpo/ações, o post-FX e o Live2D — um close de rosto não precisa deles.

## No bot

`SchedulerService.sendDailyReport` (fechamento das 21:30) chama `sendMikaVoice(..., video = true)`:
gera o TTS, renderiza em segundo plano (não segura o lock do job) e envia com `sendMikaVideo`
(`mika-video.publisher.ts`) — vídeo redondo até 60 s, vídeo comum acima disso. Um render por vez.
Qualquer falha (sem Chromium, timeout de 20 min, ffmpeg) cai na voz de sempre.
Liga sozinho quando há `assets/mika/mika.vrm` e Chromium; `MIKA_VIDEO=0` desliga.

## Limites conhecidos

- Render em WebGL por software: ~10 s de render por 1 s de vídeo (24 fps, 640 px). Serve ao relatório
  agendado, não a respostas de chat.
- A imagem Docker instala `chromium` e `ffmpeg` (alpine); o WebGL por software no Chromium do alpine
  ainda não foi validado — conferir no primeiro deploy (`MIKA_VIDEO_DEBUG=1`, log `[MikaVideo]`).
