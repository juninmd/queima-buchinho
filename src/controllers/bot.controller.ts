import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from '../services/workout.service';
import { memeService } from '../services/meme.service';
import { metricsService } from '../services/metrics.service';
import { formatBrasiliaTime, getSurpriseMessage } from '../utils/time';
import { sendAudioMessage } from '../utils/telegram';
import { WORKOUT_KEYWORDS, BOT_MESSAGES } from '../config/constants';
import { myInstantsService } from '../services/myinstants.service';
import { ollamaService } from '../services/ollama.service';

export class BotController {
    constructor(private bot: TelegramBot) { }

    public init() {
        this.setupListeners();
        this.setupCommands();
        this.setupCallbackQuery();
        console.log('🤖 Bot Queima Buchinho iniciado (Modo Listener)!');
    }

    private setupListeners() {
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text || '';
            const userId = msg.from?.id;

            if (!userId || text.startsWith('/')) return;

            if (this.hasWorkoutKeyword(text)) {
                console.log(`✅ Usuário ${userId} enviou mensagem de treino.`);
                workoutService.logWorkout(userId, true, text);
                const congrats = await memeService.getCongratsMessage();
                await this.bot.sendMessage(chatId, congrats.message);

                if (congrats.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
                    }
                }
            }
        });
    }

    private setupCommands() {
        this.bot.onText(/\/status/, (msg) => this.handleStatus(msg));
        this.bot.onText(/\/checktreino/, (msg) => this.handleCheckTreino(msg));
        this.bot.onText(/\/hora/, (msg) => this.handleHora(msg));
        this.bot.onText(/\/motivar/, (msg) => this.handleMotivar(msg));
        this.bot.onText(/\/instante (.+)/, (msg, match) => this.handleInstante(msg, match));
        this.bot.onText(/\/reset/, (msg) => this.handleReset(msg));
        this.bot.onText(/\/agua/, (msg) => this.handleAgua(msg));
        this.bot.onText(/\/peso (\d+(\.\d+)?)/, (msg, match) => this.handlePeso(msg, match));
        this.bot.onText(/\/semana/, (msg) => this.handleSemana(msg));
        this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
    }

    private hasWorkoutKeyword(text: string): boolean {
        const lowerText = text.toLowerCase();
        return WORKOUT_KEYWORDS.some((kw) => lowerText.includes(kw));
    }

    private async handleStatus(msg: TelegramBot.Message) {
        await this.bot.sendMessage(msg.chat.id, BOT_MESSAGES.STATUS_INFO);
    }

    private async handleCheckTreino(msg: TelegramBot.Message) {
        try {
            const { trained } = await workoutService.checkDailyMessages(this.bot);
            if (!trained) {
                const roast = await memeService.getRoastMessage();
                const roastAudio = memeService.getRoastAudio();

                await this.bot.sendMessage(msg.chat.id, roast.message);

                // Prioritize suggested audio from Ollama, fallback to legacy
                if (roast.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(roast.audioSearchTerm);
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(msg.chat.id, button.audioUrl, { caption: `🎶 ${button.title}` });
                        return;
                    }
                }

                if (roastAudio) {
                    await sendAudioMessage(this.bot, msg.chat.id, roastAudio, BOT_MESSAGES.ROAST_CAPTION);
                }
            } else {
                const congrats = await memeService.getCongratsMessage();
                await this.bot.sendMessage(msg.chat.id, congrats.message);

                if (congrats.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(msg.chat.id, button.audioUrl, { caption: `🎶 ${button.title}` });
                    }
                }
            }
        } catch (e) {
            console.error('Erro no checktreino:', e);
            await this.bot.sendMessage(msg.chat.id, BOT_MESSAGES.ERROR_GENERIC);
        }
    }

    private async handleHora(msg: TelegramBot.Message) {
        const time = formatBrasiliaTime();
        const surprise = getSurpriseMessage();
        await this.bot.sendMessage(msg.chat.id, `🕒 Horário de Brasília: ${time}\n\n${surprise}`);
    }

    private async handleMotivar(msg: TelegramBot.Message) {
        const audio = memeService.getMotivationAudio();
        await sendAudioMessage(this.bot, msg.chat.id, audio, BOT_MESSAGES.MOTIVATION_CAPTION);
    }

    private async handleInstante(msg: TelegramBot.Message, match: RegExpExecArray | null) {
        const chatId = msg.chat.id;
        const query = match ? match[1] : '';

        if (!query) return;

        try {
            const button = await myInstantsService.getBestMatchAudio(query);
            if (button && button.audioUrl) {
                await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
            } else {
                await this.bot.sendMessage(chatId, '❌ Nenhum áudio encontrado no MyInstants.');
            }
        } catch (error) {
            console.error('Erro ao buscar áudio no MyInstants:', error);
            await this.bot.sendMessage(chatId, '❌ Erro ao buscar áudio.');
        }
    }

    private async handleReset(msg: TelegramBot.Message) {
        if (msg.from?.id) {
            workoutService.resetWorkout(msg.from.id);
            await this.bot.sendMessage(msg.chat.id, BOT_MESSAGES.RESET_SUCCESS);
        }
    }

    private async handleHelp(msg: TelegramBot.Message) {
        const helpMsg = `
🔥 *Queima Buchinho Bot* 🔥

Este bot ajuda você a manter a motivação para treinar e se manter saudável!

*Métricas:*
- /agua: Registra consumo de água (com botões)
- /peso <valor>: Registra seu peso atual
- /semana: Relatório semanal comparativo (Mika tóxica 😈)

*Treino:*
- Envie "treinei" (ou similiares) para registrar o treino do dia
- /checktreino: Verificação manual do dia
- /status: Status oficial (22h via Actions)

*Outros:*
- /motivar: Receba um áudio motivacional
- /instante <termo>: Busca sons no MyInstants
- /hora: Horário de Brasília
- /reset: Reseta seu treino de hoje
        `;
        await this.bot.sendMessage(msg.chat.id, helpMsg, { parse_mode: 'Markdown' });
    }

    private async handleAgua(msg: TelegramBot.Message) {
        const chatId = msg.chat.id;
        const today = await metricsService.getTodaySum(msg.from?.id || 0, 'water');
        
        const options: TelegramBot.SendMessageOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🥤 +250ml', callback_data: 'add_water_250' },
                        { text: '🥛 +500ml', callback_data: 'add_water_500' }
                    ],
                    [
                        { text: '🍼 +1L', callback_data: 'add_water_1000' }
                    ]
                ]
            }
        };

        await this.bot.sendMessage(chatId, `💧 *Consumo de Água*\nTotal de hoje: ${today}ml\n\nEscolha uma quantidade para adicionar:`, options);
    }

    private async handlePeso(msg: TelegramBot.Message, match: RegExpExecArray | null) {
        const userId = msg.from?.id;
        const chatId = msg.chat.id;
        if (!userId || !match) return;

        const weight = parseFloat(match[1]);
        await metricsService.logMetric(userId, 'weight', weight, 'kg');
        
        const diff = await metricsService.getWeightDiffFromStart(userId);
        const response = await ollamaService.getWeightUpdate(weight, diff);
        
        if (response) {
            await this.bot.sendMessage(chatId, response.message);
            if (response.audioSearchTerm) {
                const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
                if (button?.audioUrl) {
                    await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
                }
            }
        } else {
            await this.bot.sendMessage(chatId, `✅ Peso de ${weight}kg registrado com sucesso!`);
        }
    }

    private setupCallbackQuery() {
        this.bot.on('callback_query', async (query) => {
            const userId = query.from.id;
            const chatId = query.message?.chat.id;
            const data = query.data;

            if (!chatId || !data) return;

            if (data.startsWith('add_water_')) {
                const amount = parseInt(data.replace('add_water_', ''));
                await metricsService.logMetric(userId, 'water', amount, 'ml');
                
                const total = await metricsService.getTodaySum(userId, 'water');
                
                // Answer query so the loading state goes away in Telegram
                await this.bot.answerCallbackQuery(query.id, { text: `Adicionado ${amount}ml! Total: ${total}ml` });
                
                // Send Mika response
                const response = await ollamaService.getWaterSuccess(total);
                if (response) {
                    await this.bot.sendMessage(chatId, response.message);
                }

                // Update the original message if possible
                try {
                    await this.bot.editMessageText(`💧 *Consumo de Água*\nTotal de hoje: ${total}ml\n\nAdicionado com sucesso!`, {
                        chat_id: chatId,
                        message_id: query.message?.message_id,
                        parse_mode: 'Markdown'
                    });
                } catch (e) {
                    // Message might be the same or too old
                }
            }

            if (data === 'mark_trained') {
                await workoutService.logWorkout(userId, true, 'Botton click');
                await this.bot.answerCallbackQuery(query.id, { text: '🏋️‍♂️ Treino registrado com sucesso!' });
                
                const congrats = await memeService.getCongratsMessage();
                await this.bot.sendMessage(chatId, congrats.message);

                if (congrats.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
                    }
                }

                try {
                    await this.bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                        chat_id: chatId,
                        message_id: query.message?.message_id
                    });
                } catch (e) {}
            }
        });
    }

    private async handleSemana(msg: TelegramBot.Message) {
        const userId = msg.from?.id;
        const chatId = msg.chat.id;
        if (!userId) return;

        try {
            await this.bot.sendChatAction(chatId, 'typing');
            const summary = await metricsService.getWeeklySummary(userId);
            
            if (!summary) {
                await this.bot.sendMessage(chatId, '❌ Erro ao gerar resumo semanal.');
                return;
            }

            const response = await ollamaService.getWeeklyReport(summary);
            
            if (response) {
                const waterEmoji = summary.current.metrics.water >= summary.previous.metrics.water ? '📈' : '📉';
                const workoutEmoji = summary.current.workouts >= summary.previous.workouts ? '📈' : '📉';

                let report = `📊 *Resumo Semanal (Comparação)*\n\n`;
                report += `💪 Treinos: ${summary.current.workouts} vs ${summary.previous.workouts} ${workoutEmoji}\n`;
                report += `💧 Água: ${summary.current.metrics.water}ml vs ${summary.previous.metrics.water}ml ${waterEmoji}\n\n`;
                report += `🗣️ *Mika diz:* ${response.message}`;

                await this.bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });

                if (response.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` });
                    }
                }
            }
        } catch (error) {
            console.error('Erro no handleSemana:', error);
            await this.bot.sendMessage(chatId, '❌ Erro ao processar resumo semanal.');
        }
    }
}
