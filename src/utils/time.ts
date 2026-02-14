const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna a data atual no formato YYYY-MM-DD, considerando o fuso horário de Brasília.
 */
export function getBrasiliaDateString(): string {
  // 'en-CA' garante o formato YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: BRASILIA_TIMEZONE });
}

/**
 * Retorna o timestamp (Date) correspondente ao início do dia atual (00:00:00) em Brasília.
 * Útil para comparações de datas.
 */
export function getBrasiliaDayStart(): Date {
  const dateString = getBrasiliaDateString();
  // Assume offset fixo de -03:00 para garantir UTC-3 conforme solicitado.
  // Isso cria uma data UTC correspondente a 00:00:00 BRT.
  return new Date(`${dateString}T00:00:00-03:00`);
}

/**
 * Retorna a hora atual formatada (HH:mm) em Brasília.
 */
export function formatBrasiliaTime(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: BRASILIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Retorna uma mensagem surpreendente baseada no horário de Brasília.
 */
export function getSurpriseMessage(): string {
  const nowString = new Date().toLocaleTimeString('en-GB', {
    timeZone: BRASILIA_TIMEZONE,
    hour: '2-digit',
    hour12: false
  });
  const hour = parseInt(nowString, 10);

  if (hour >= 5 && hour < 9) {
    return "🌅 Acorda pra cuspir, bora treinar!";
  } else if (hour >= 9 && hour < 12) {
    return "🐓 O sol já nasceu lá na fazendinha...";
  } else if (hour >= 12 && hour < 14) {
    return "🥗 Hora do almoço, mas foca na dieta!";
  } else if (hour >= 14 && hour < 18) {
    return "💪 Ainda dá tempo de pagar o treino!";
  } else if (hour >= 18 && hour < 22) {
    return "🌙 Sem desculpas, a noite é uma criança (musculosa)!";
  } else {
    return "💤 Vá dormir, o músculo cresce no descanso!";
  }
}
