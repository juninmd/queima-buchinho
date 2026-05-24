import TelegramBot from 'node-telegram-bot-api';
import { replyMika } from '../utils/telegram';
import { logger } from '../utils/logger';

// Command Handlers
import { handleMetric } from './handlers/metric.handler';
import { handleInstante, handleMeme, handleSticker, handleGif } from './handlers/media.handler';
import {
    handleStatus,
    handleHora,
    handleMotivar,
    handleStreak,
    handleRelatorio,
    handleCheckTreino,
    handleCardio,
    handleReset
} from './handlers/workout.handler';

export class BotController {
    private readonly startTime = Math.floor(Date.now() / 1000);

    constructor(private bot: TelegramBot) { }

    public init() {
        this.setupListeners();
        this.setupCommands();
        logger.info('🤖 Bot Queima Buchinho iniciado (Modo Listener)!');
    }

    private setupListeners() {
        const handleMessage = async (msg: TelegramBot.Message) => {
            const text = msg.text || '';
            const userId = msg.from?.id || msg.sender_chat?.id;
            if (!userId || text.startsWith('/')) return;
            if (msg.date < this.startTime) return;
        };

        this.bot.on('message', handleMessage);
        this.bot.on('channel_post', handleMessage);
    }

    private setupCommands() {
        const commands = [
            { regex: /^\/start(@\w+)?$/, handler: (msg: TelegramBot.Message) => replyMika(this.bot, msg.chat.id, '🔥 Mika na área! Use /menu para ver seus hábitos e registrar seu treino pelo botão.') },
            { regex: /^\/status(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleStatus(this.bot, msg) },
            { regex: /^\/checktreino(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleCheckTreino(this.bot, msg) },
            { regex: /^\/cardio(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleCardio(this.bot, msg) },
            { regex: /^\/relatorio(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleRelatorio(this.bot, msg) },
            { regex: /^\/hora(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleHora(this.bot, msg) },
            { regex: /^\/motivar(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleMotivar(this.bot, msg) },
            { regex: /^\/streak(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleStreak(this.bot, msg) },
            { regex: /^\/passos(@\w+)? (\d+)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'steps', 'passos') },
            { regex: /^\/instante(@\w+)? (.+)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleInstante(this.bot, msg, match) },
            { regex: /^\/reset(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleReset(this.bot, msg) },
            { regex: /^\/peso(@\w+)? (\d+(\.\d+)?)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'weight', 'kg') },
            { regex: /^\/altura(@\w+)? (\d+(\.\d+)?)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'height', 'cm') },
            { regex: /^\/gordura(@\w+)? (\d+(\.\d+)?)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'body_fat', '%') },
            { regex: /^\/musculo(@\w+)? (\d+(\.\d+)?)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'muscle_mass', '%') },
            { regex: /^\/meme(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleMeme(this.bot, msg, null) },
            { regex: /^\/meme(@\w+)? (.+)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleMeme(this.bot, msg, match) },
            { regex: /^\/sticker(@\w+)?$/, handler: (msg: TelegramBot.Message) => handleSticker(this.bot, msg, null) },
            { regex: /^\/sticker(@\w+)? (.+)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleSticker(this.bot, msg, match) },
            { regex: /^\/gif(@\w+)? (.+)/, handler: (msg: TelegramBot.Message, match: RegExpExecArray) => handleGif(this.bot, msg, match) }
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
}
