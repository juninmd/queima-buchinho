const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna a data atual no formato YYYY-MM-DD, considerando o fuso horário de Brasília.
 * Se for madrugada (00:00 às 03:59), assume o dia anterior para cobrir atrasos do GitHub Actions.
 */
export function getBrasiliaDateString(): string {
  const now = new Date();
  const hourString = now.toLocaleTimeString('en-GB', {
    timeZone: BRASILIA_TIMEZONE,
    hour: '2-digit',
    hour12: false
  });
  const hour = parseInt(hourString, 10);
  
  const targetDate = hour >= 0 && hour < 4 
    ? new Date(now.getTime() - 24 * 60 * 60 * 1000) 
    : now;

  return targetDate.toLocaleDateString('en-CA', { timeZone: BRASILIA_TIMEZONE });
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

/**
 * Retorna o nome do dia da semana em português (minúsculo).
 */
export function getBrasiliaDayName(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: BRASILIA_TIMEZONE,
    weekday: 'long'
  }).toLowerCase();
}

/**
 * Contexto de tempo para os prompts da Mika: hora atual + dia da semana + aniversário se for hoje.
 */
export function getMikaContext(): string {
  const time = formatBrasiliaTime();
  const day = getBrasiliaDayName();
  const birthdayNote = isTodayBirthday() ? ' HOJE É ANIVERSÁRIO DO MESTRE!' : '';
  return `Agora são ${time} de ${day}.${birthdayNote}`;
}

/**
 * Retorna o nome da refeição e o horário atual para o LLM decidir o tom da reação.
 * Sem piadas hardcoded — o LLM faz o julgamento de horário.
 */
export function getMealTimeComment(meal: 'cafe' | 'almoco' | 'cafe_tarde' | 'jantar'): string {
  const time = formatBrasiliaTime();
  const names = { cafe: 'café da manhã', almoco: 'almoço', cafe_tarde: 'café da tarde', jantar: 'jantar' };
  return `${names[meal]} às ${time}`;
}

/**
 * Verifica se hoje é o aniversário do usuário (lê USER_BIRTHDAY do .env, formato DD/MM ou DD/MM/YYYY).
 */
export function isTodayBirthday(): boolean {
  const raw = process.env.USER_BIRTHDAY;
  if (!raw) return false;
  const parts = raw.split('/');
  if (parts.length < 2) return false;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(day) || isNaN(month)) return false;

  const today = getBrasiliaDateString();
  const todayDay = parseInt(today.split('-')[2], 10);
  const todayMonth = parseInt(today.split('-')[1], 10);
  return todayDay === day && todayMonth === month;
}

/**
 * Retorna a idade do usuário se USER_BIRTHDAY incluir o ano (DD/MM/YYYY).
 */
export function getBirthdayAge(): number | null {
  const raw = process.env.USER_BIRTHDAY;
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length < 3) return null;
  const birthYear = parseInt(parts[2], 10);
  if (isNaN(birthYear)) return null;
  const currentYear = parseInt(getBrasiliaDateString().split('-')[0], 10);
  return currentYear - birthYear;
}
