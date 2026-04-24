import TelegramBot from 'node-telegram-bot-api';
import { workoutService } from '../services/workout.service';
import { memeService } from '../services/meme.service';
import { metricsService, MetricType } from '../services/metrics.service';
import { habitsService } from '../services/habits.service';
import { ollamaService } from '../services/ollama.service';
import { ttsService } from '../services/tts.service';
import { myInstantsService } from '../services/myinstants.service';
import { formatBrasiliaTime, getSurpriseMessage } from '../utils/time';
import { sendAudioMessage } from '../utils/telegram';
import { WORKOUT_KEYWORDS, CARDIO_KEYWORDS, BOT_MESSAGES } from '../config/constants';
import { logger } from '../utils/logger';

export class BotController {
    constructor(private bot: TelegramBot) { }

    public init() {
        this.setupListeners();
        this.setupCommands();
        logger.info('🤖 Bot Queima Buchinho iniciado (Modo Listener)!');
    }

    private setupListeners() {
        const handleMessage = async (msg: TelegramBot.Message) => {
            const text = msg.text || '';
            const userId = msg.from?.id || msg.sender_chat?.id; // Support for channels
            if (!userId || text.startsWith('/')) return;

            if (this.hasWorkoutKeyword(text)) {
                logger.info(`✅ Evento em chat ${msg.chat.id} identificado como treino de ${userId}`);    
                await workoutService.logWorkout(userId, true, text);
                await habitsService.markHabit(userId, 'treino', true);

                const congrats = await memeService.getCongratsMessage();
                await this.replyMika(msg.chat.id, congrats.message);

                if (congrats.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);   
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(msg.chat.id, button.audioUrl, { caption: `🎶 ${button.title}` });
                    }
                }
            } else if (this.hasCardioKeyword(text)) {
                logger.info(`🏃 Evento em chat ${msg.chat.id} identificado como cárdio de ${userId}`);    
                await habitsService.markHabit(userId, 'cardio', true);

                const response = await ollamaService.getHabitResponse('cardio');
                if (response) await this.replyMika(msg.chat.id, response.message);
            }
        };

        this.bot.on('message', handleMessage);
        this.bot.on('channel_post', handleMessage);
    }

    private setupCommands() {
        const commands = [
            { regex: /^\/start(@\w+)?$/, handler: (msg: TelegramBot.Message) => this.replyMika(msg.chat.id, '🔥 Mika na área! Use /menu para ver seus hábitos ou mande "treinei" para logar seu treino.') },        
            { regex: /^\/status(@\w+)?$/, handler: (msg: TelegramBot.Message) => this.handleStatus(msg) },
            { regex: /^\/checktreino(@\w+)?$/, handler: (msg: TelegramBot.Message) => this.handleCheckTreino(msg) },
            { regex: /^\/cardio(@\w+)?$/, handler: (msg: TelegramBot.Message) => this.handleCardio(msg) },
            { regex: /^\/relatorio(@\w+)?$/, handler: (msg: TelegramBot.Message) => this.handleRelatorio(msg) },
            { regex: /^\/hora(@\w+)?$/, handler: (msg: TelegramBot.Message) => this.handleHora(msg) },    
            { regex: /^\/motivar(@\w+)?$/, handler: (msg: TelegramBot.Message) => this.handleMotivar(msg) },
            { regex: /^\/instante(@\w+)? (.+)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => this.handleInstante(msg, match) },
            { regex: /^\/reset(@\w+)?$/, handler: (msg: TelegramBot.Message) => this.handleReset(msg) },  
            { regex: /^\/peso(@\w+)? (\d+(\.\d+)?)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => this.handleMetric(msg, match, 'weight', 'kg') },
            { regex: /^\/altura(@\w+)? (\d+(\.\d+)?)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => this.handleMetric(msg, match, 'height', 'cm') },
            { regex: /^\/gordura(@\w+)? (\d+(\.\d+)?)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => this.handleMetric(msg, match, 'body_fat', '%') },
            { regex: /^\/musculo(@\w+)? (\d+(\.\d+)?)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => this.handleMetric(msg, match, 'muscle_mass', '%') }
        ];

        const processCommand = async (msg: TelegramBot.Message) => {
            const text = msg.text || '';
            logger.info(`[Telegram] Processando mensagem: "${text}" de ${msg.from?.first_name} (${msg.from?.id})`);

            for (const cmd of commands) {
                const match = cmd.regex.exec(text);
                if (match) {
                    logger.info(`✅ [BotController] Comando identificado: ${text}`);
                    await cmd.handler(msg, match);
                    return;
                }
            }
            logger.warn(`⚠️ [BotController] Comando ignorado ou não reconhecido: ${text}`);
        };

        this.bot.on('message', processCommand);
        this.bot.on('channel_post', processCommand);
    }

    private hasWorkoutKeyword(text: string): boolean {
        return WORKOUT_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
    }

    private hasCardioKeyword(text: string): boolean {
        return CARDIO_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
    }

    private async handleStatus(msg: TelegramBot.Message) {
        await this.replyMika(msg.chat.id, BOT_MESSAGES.STATUS_INFO);
    }

    private async handleRelatorio(msg: TelegramBot.Message) {
        const userId = msg.from?.id || msg.sender_chat?.id;
        const chatId = msg.chat.id;
        if (!userId) return;

        try {
            await this.bot.sendChatAction(chatId, 'record_voice');

            const [{ trained }, dailySummary, habitsCount] = await Promise.all([
                workoutService.checkDailyMessages(this.bot, Number(userId)),
                metricsService.getDailySummary(Number(userId)),
                habitsService.getCompletedCount(Number(userId))
            ]);

            const prompt = `Gere um relatório diário debochado para o usuário.
            Dados de hoje:
            - Treinou: ${trained ? 'Sim (Milagre!)' : 'Não (Frango!)'}
            - Água: ${dailySummary.water}ml
            - Hábitos completados: ${habitsCount.completed}/${habitsCount.total}
            - Peso atual: ${dailySummary.weight ? dailySummary.weight + 'kg' : 'Não pesou hoje'}

            Seja ácida, mencione que ele(a) precisa de mais cárdio e não esqueça de falar sobre dominar o mundo.`;

            const mikaResponse = await ollamaService.generateDynamicResponse(prompt);

            if (mikaResponse) {
                const audioPath = await ttsService.generateMikaAudio(mikaResponse.message);
                await sendAudioMessage(this.bot, chatId, audioPath, `🎙️ Relatório da Mika: ${mikaResponse.message.substring(0, 100)}...`);
                await ttsService.cleanup(audioPath);
            } else {
                await this.replyMika(chatId, "✨ Mestre, minha paciência é infinita para esperar sua grandeza, mas o Ollama decidiu tirar um cochilo. Vamos treinar enquanto ele não volta? ✨");
            }
        } catch (error: any) {
            logger.error('Erro ao gerar relatório de áudio:', error);
            const errMsg = error.message || 'Erro desconhecido';
            await this.replyMika(chatId, `❌ **Erro Cósmico!**\n\nTentei gerar seu relatório, mas algo deu errado: \`${errMsg}\``);
        }
    }

    private async handleCheckTreino(msg: TelegramBot.Message) {
        try {
            const { trained } = await workoutService.checkDailyMessages(this.bot);
            if (!trained) {
                const roast = await memeService.getRoastMessage();
                const roastAudio = memeService.getRoastAudio();
                await this.replyMika(msg.chat.id, roast.message);

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
                await this.replyMika(msg.chat.id, congrats.message);
                if (congrats.audioSearchTerm) {
                    const button = await myInstantsService.getBestMatchAudio(congrats.audioSearchTerm);   
                    if (button?.audioUrl) {
                        await this.bot.sendAudio(msg.chat.id, button.audioUrl, { caption: `🎶 ${button.title}` });
                    }
                }
            }
        } catch (e: any) {
            logger.error('Erro no checktreino:', e);
            await this.replyMika(msg.chat.id, `❌ **Erro no Check-treino:** \`${e.message || 'Erro desconhecido'}\``);
        }
    }

    private async handleCardio(msg: TelegramBot.Message) {
        const userId = msg.from?.id || msg.sender_chat?.id;
        const chatId = msg.chat.id;
        if (!userId) return;

        await habitsService.markHabit(userId, 'cardio', true);
        const response = await ollamaService.getHabitResponse('cardio');
        if (response) await this.replyMika(chatId, response.message);
    }

    private async handleHora(msg: TelegramBot.Message) {
        const time = formatBrasiliaTime();
        const surprise = getSurpriseMessage();
        await this.replyMika(msg.chat.id, `🕒 Horário de Brasília: ${time}\n\n${surprise}`);
    }

    private async handleMotivar(msg: TelegramBot.Message) {
        const audio = memeService.getMotivationAudio();
        await sendAudioMessage(this.bot, msg.chat.id, audio, BOT_MESSAGES.MOTIVATION_CAPTION);
    }

    private async handleInstante(msg: TelegramBot.Message, match: RegExpExecArray | null) {
        const query = match ? match[2] : '';
        if (!query) return;

        try {
            const button = await myInstantsService.getBestMatchAudio(query);
            if (button?.audioUrl) {
                await this.bot.sendAudio(msg.chat.id, button.audioUrl, { caption: `🎶 ${button.title}` });
            } else {
                await this.bot.sendMessage(msg.chat.id, '❌ Nenhum áudio encontrado no MyInstants.');     
            }
        } catch (error: any) {
            logger.error('Erro ao buscar áudio no MyInstants:', error);
            await this.bot.sendMessage(msg.chat.id, `❌ **Erro no MyInstants:** \`${error.message || 'Erro desconhecido'}\``);
        }
    }

    private async handleReset(msg: TelegramBot.Message) {
        if (msg.from?.id) {
            await workoutService.resetWorkout(msg.from.id);
            await this.replyMika(msg.chat.id, BOT_MESSAGES.RESET_SUCCESS);
        }
    }

    private async handleMetric(msg: TelegramBot.Message, match: RegExpExecArray | null, type: MetricType, unit: string) {
        const userId = msg.from?.id || msg.sender_chat?.id;
        const chatId = msg.chat.id;
        if (!userId || !match) return;

        const value = parseFloat(match[2]);
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
            await this.replyMika(chatId, response.message);
            if (response.audioSearchTerm) {
                const button = await myInstantsService.getBestMatchAudio(response.audioSearchTerm);       
                if (button?.audioUrl) {
                    await this.bot.sendAudio(chatId, button.audioUrl, { caption: `🎶 ${button.title}` }); 
                }
            }
        } else {
            await this.replyMika(chatId, `✅ ${label.charAt(0).toUpperCase() + label.slice(1)} de ${value}${unit} registrado!`);
        }
    }

    private async replyMika(chatId: number, text: string) {
        try {
            const audioPath = await ttsService.generateMikaAudio(text);
            await sendAudioMessage(this.bot, chatId, audioPath, text);
            await ttsService.cleanup(audioPath);
        } catch (error) {
            logger.error('Erro ao responder com áudio da Mika:', error);
            await this.bot.sendMessage(chatId, text); // Fallback total
        }
    }
}
