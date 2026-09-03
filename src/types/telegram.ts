import type { SendMessageParams } from 'node-telegram-bot-api';

/** Equivalente ao antigo `TelegramBot.SendMessageOptions` dos @types (removido nos tipos embutidos da v1). */
export type SendMessageOptions = Omit<SendMessageParams, 'chat_id' | 'text'>;
