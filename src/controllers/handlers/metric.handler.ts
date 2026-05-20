import TelegramBot from 'node-telegram-bot-api';
import { metricsService, MetricType } from '../../services/metrics.service';
import { ollamaService } from '../../services/ollama.service';
import { myInstantsService } from '../../services/myinstants.service';
import { METRIC_LIMITS, BOT_MESSAGES } from '../../config/constants';
import { replyMika } from '../../utils/telegram';

export async function handleMetric(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
    type: MetricType,
    unit: string
): Promise<void> {
    const userId = msg.from?.id || msg.sender_chat?.id;
    const chatId = msg.chat.id;
    if (!userId || !match) return;

    const value = parseFloat(match[2]);
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

    let response;
    if (type === 'weight') {
        const diff = await metricsService.getWeightDiffFromStart(userId);
        response = await ollamaService.getWeightUpdate(value, diff);
    } else {
        response = await ollamaService.generateDynamicResponse(
            `A pessoa acabou de registrar ${value}${unit} de ${label}. Dê um comentário curto e sarcástico sobre isso.`
        );
    }

    if (response) {
        await replyMika(bot, chatId, response.message);
        if (response.audioSearchTerm) {
            const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
            if (button?.audioUrl) {
                await bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
            }
        }
    } else {
        await replyMika(bot, chatId, `✅ ${label.charAt(0).toUpperCase() + label.slice(1)} de ${value}${unit} registrado!`);
    }
}
