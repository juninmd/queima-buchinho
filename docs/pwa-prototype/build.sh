#!/usr/bin/env bash
# Junta os fontes do protótipo em um único HTML: ./build.sh saida.html
set -e; cd "$(dirname "$0")"
{ cat head.html; echo '<style>'; cat css/base.css css/comp.css css/screens.css; echo '</style>'; cat body.html
  echo '<script>'; cat js/data.js js/core.js js/actions.js js/hoje.js js/habitos.js js/treino.js js/progresso.js js/mika.js js/ajustes.js js/page.js; echo '</script>'; } > "${1:-dist.html}"
