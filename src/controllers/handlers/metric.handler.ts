import TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { metricsService, MetricType } from '../../services/metrics.service';
import { mikaService } from '../../services/mika.service';
import { METRIC_LIMITS, BOT_MESSAGES } from '../../config/constants';
import { replyMika } from '../../utils/telegram';
import { parseDecimalBR, parseIntegerBR } from '../../utils/number';
import { showWeightPicker } from '../../features/quick-log/weight-picker';

const USAGE: Partial<Record<MetricType, string>> = {
    weight: '/peso 82,5', height: '/altura 175', body_fat: '/gordura 18,5',
    muscle_mass: '/musculo 40', steps: '/passos 8000',
};

export async function handleMetric(
    bot: TelegramBot,
    msg: Message,
    match: RegExpExecArray | null,
    type: MetricType,
    unit: string
): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    const chatId = msg.chat.id;
    if (!userId || !match) return;

    const raw = match[2];
    if (raw === undefined && type === 'weight') return showWeightPicker(bot, chatId, userId);
    const value = type === 'steps' ? parseIntegerBR(raw ?? '') : parseDecimalBR(raw ?? '');
    if (value === null) {
        await bot.sendMessage(chatId, `Não entendi o valor. Exemplo: ${USAGE[type] ?? '/peso 82,5'}`);
        return;
    }
    const limits = METRIC_LIMITS[type as keyof typeof METRIC_LIMITS];
    if (limits && (value < limits.min || value > limits.max)) {
        await bot.sendMessage(chatId, BOT_MESSAGES.METRIC_OUT_OF_RANGE(type, limits.min, limits.max, unit));
        return;
    }

    await bot.sendChatAction(chatId, 'typing');
    await metricsService.logMetric(userId, type, value, unit);

    const labels: Record<string, string> = {
        weight: 'peso',
        height: 'altura',
        body_fat: 'gordura corporal',
        muscle_mass: 'massa muscular'
    };
    const label = labels[type] || type;

    let prompt = `A pessoa acabou de registrar ${value}${unit} de ${label}. Comentario curto e sarcastico.`;
    if (type === 'weight') {
        const diff = await metricsService.getWeightDiffFromStart(userId);
        const diffMsg = diff === 0 ? 'peso estavel' : (diff < 0 ? `perdeu ${Math.abs(diff)}kg` : `ganhou ${diff}kg`);
        prompt = `O Mestre pesou ${value}kg (${diffMsg}). Comente de forma natural, sem coach fitness.`;
    }

    const response = await mikaService.response(prompt);
    await replyMika(bot, chatId, response.message);
}
