import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from '../services/workout.service';
import { memeService } from '../services/meme.service';
import { metricsService } from '../services/metrics.service';
import { habitsService } from '../services/habits.service';
import { ollamaService } from '../services/ollama.service';
import { myInstantsService } from '../services/myinstants.service';
import { formatBrasiliaTime, getSurpriseMessage } from '../utils/time';
import { sendAudioMessage } from '../utils/telegram';
import { WORKOUT_KEYWORDS, BOT_MESSAGES } from '../config/constants';

export class BotController {
    constructor(private bot: TelegramBot) { }

    public init() {
        this.setupListeners();
        this.setupCommands();
        console.log('🤖 Bot Queima Buchinho iniciado (Modo Listener)!');
    }

    private setupListeners() {
        this.bot.on('message', async (msg) => {
            const text = msg.text || '';
            const userId = msg.from?.id;
            if (!userId || text.startsWith('/')) return;

            if (this.hasWorkoutKeyword(text)) {
                console.log(`✅ Usuário ${userId} enviou mensagem de treino.`);
                workoutService.logWorkout(userId, true, text);
                habitsService.markHabit(userId, 'treino', true);

                const congrats = await memeService.getCongratsMessage();
                await this.bot.sendMessage(msg.chat.id, congrats.message);

                if (congrats.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(msg.chat.id, button.audioUrl, { caption: `🎶 ${button.title}` });
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
        this.bot.onText(/\/peso (\d+(\.\d+)?)/, (msg, match) => this.handlePeso(msg, match));
    }

    private hasWorkoutKeyword(text: string): boolean {
        return WORKOUT_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
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
        const query = match ? match[1] : '';
        if (!query) return;

        try {
            const button = await myInstantsService.getBestMatchAudio(query);
            if (button?.audioUrl) {
                await this.bot.sendAudio(msg.chat.id, button.audioUrl, { caption: `🎶 ${button.title}` });
            } else {
                await this.bot.sendMessage(msg.chat.id, '❌ Nenhum áudio encontrado no MyInstants.');
            }
        } catch (error) {
            console.error('Erro ao buscar áudio no MyInstants:', error);
            await this.bot.sendMessage(msg.chat.id, '❌ Erro ao buscar áudio.');
        }
    }

    private async handleReset(msg: TelegramBot.Message) {
        if (msg.from?.id) {
            workoutService.resetWorkout(msg.from.id);
            await this.bot.sendMessage(msg.chat.id, BOT_MESSAGES.RESET_SUCCESS);
        }
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
}
