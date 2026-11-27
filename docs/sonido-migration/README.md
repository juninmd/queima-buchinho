# Troca dos primitivos do dashboard pelo Sonido

O dashboard mantinha à mão vários padrões que o [`@juninmd/sonido`](https://github.com/juninmd/sonido)
já publica. Esta pasta guarda a comparação lado a lado usada na revisão da troca e as cópias dos
componentes antigos.

| Primitivo do app | Antes | Depois (`@juninmd/sonido`) | Onde |
| --- | --- | --- | --- |
| `.btn` | botão com borda/fundo próprios | `Button` (`primary`/`secondary`/`danger`, `size`, `loading`) | `WaterCard`, `Hoje`, `Habitos`, `Treino`, `ExerciseCard`, `Ajustes`, `Connect`, `MeasuresForm`, `ConnectionCard`, `PauseCard`, `PushCard`, `QuickLog`, `Mika`, `MikaAnalysis` |
| `.chip` | pílula com `color-mix` local | `Badge` (`success`/`warning`/`aqua`/`violet`) | `Habitos`, `Treino` |
| `.seg` | tablist caseiro com `aria-pressed` | `Tabs` (`variant="pill"`, foco itinerante e ARIA de tablist) | `src/components/ui/Seg.tsx` → `Habitos`, `Progresso` |
| `.sw` | `<button role="switch">` desenhado no CSS | `Switch` (checkbox real, `role="switch"`) | `PushCard` |
| `.stat-card` + barra | card e barra locais | `StatTile` + `ProgressBar` | `StatCard` → `DailyPanel`, `RangePanel` |
| `.bar` | barra de água com marcador de ritmo | `ProgressBar` + marcador em ponte de layout | `WaterCard` |
| `.ring` | SVG do anel desenhado à mão | `ProgressRing` | `src/components/ui/Ring.tsx` → `Hoje` |
| `Skeleton` | blocos com `shimmer` local | `Skeleton` (anúncio em região viva) | `Hoje`, `DailyPanel`, `RangePanel`, `MikaAnalysis` |
| `.toast` | `<div role="status">` + timer local | `ToastProvider` (região `aria-live`, drenagem pausável) | `src/app/Toast.tsx` → todo o app |
| estado vazio em texto | frase cinza solta | `EmptyState` com título, descrição e ação | `WeightChart`, `Habitos`, `MikaAnalysis` |

A ponte de tema fica em `dashboard/src/lib/sonido.ts`: o app escolhe claro/escuro por
`prefers-color-scheme`, e o `data-theme` do Sonido acompanha com `canto` / `canto-claro`. O CSS do
Sonido é importado antes do CSS do app em `dashboard/src/main.tsx`.

## Componentes que ficaram como estavam

- `Card`: os cards do app são `<section>`, `<article>` e `<form>` com semântica própria, e a
  superfície é compartilhada por todas as telas. Trocar por `Card` (um `<div>`) perderia a
  semântica; fica para uma mudança de layout separada.
- `NavBar`: navegação inferior específica do app, sem equivalente no Sonido.
- Bolhas do chat da Mika e os pontos de série do treino: não há primitivo equivalente publicado.

## Como as imagens foram geradas

`preview.html` + `preview.tsx` montam a mesma página com os dois lados. O lado **Antes** importa
cópias literais de `origin/master` em `legacy/` (só o caminho do import foi ajustado); o lado
**Depois** importa os arquivos do app já apoiados no Sonido. O CSS real do dashboard é carregado
junto com `@juninmd/sonido/styles.css`.

Com `bun run dev -- --port 5305` em `dashboard/`:

```bash
# http://localhost:5305/sonido-migration/preview.html?parte=1
# http://localhost:5305/sonido-migration/preview.html?parte=2
```

O `vite.config.ts` tem um middleware só de dev que serve este HTML fora do root do Vite; o entry
`dashboard/sonido-preview.tsx` importa `preview.tsx` e o app real. Ele fica fora de `src/` de
propósito: assim o `tsc` do app não resolve esta pasta de documentação no build de produção/Docker.

As capturas (`antes-depois-1.png`, `antes-depois-2.png`) foram feitas em Chromium 1180×900,
`deviceScaleFactor: 2`, `fullPage`, com dados fictícios. A página inteira passava de 400 KB por
captura, então a comparação foi dividida em duas partes.
