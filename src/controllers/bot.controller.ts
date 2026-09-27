import TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { mikaService } from '../services/mika.service';
import { replyMika } from '../utils/telegram';
import { logger } from '../utils/logger';
import { handleQuickLog } from '../features/quick-log/quick-log.handler';
import { handlePausar, handleVoltar } from '../features/pause/pause.handler';

// Command Handlers
import { handleMetric } from './handlers/metric.handler';
import { handleInstante, handleMeme, handleSticker, handleGif } from './handlers/media.handler';
import { handleCantada } from './handlers/fun.handler';
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
        const handleMessage = async (msg: Message) => {
            const text = msg.text || '';
            const userId = msg.from?.id || msg.sender_chat?.id;
            if (!userId || text.startsWith('/')) return;
            if (msg.date < this.startTime) return;

            const isPrivate = msg.chat?.type === 'private';
            // Registro rápido só no privado: em grupo, frases soltas não são dirigidas ao bot.
            if (isPrivate && msg.chat?.id && await handleQuickLog(this.bot, msg.chat.id, userId, text).catch(e => {
                logger.error('Erro no registro rápido:', e);
                return false;
            })) return;
            const mentionsMika = text.toLowerCase().includes('mika');
            if (msg.chat?.id && (isPrivate || mentionsMika)) {
                try {
                    await this.bot.sendChatAction(msg.chat.id, 'record_voice');
                    const response = await mikaService.response(text);
                    await replyMika(this.bot, msg.chat.id, response.message);
                } catch (e) {
                    logger.error('Erro no auto-reply da Mika:', e);
                }
            }
        };

        this.bot.on('message', handleMessage);
        this.bot.on('channel_post', handleMessage);
    }

    private setupCommands() {
        const commands = [
            { regex: /^\/start(@\w+)?$/, handler: async (msg: Message) => {
                const response = await mikaService.response('Mensagem curta de boas-vindas da Mika. Diga para usar /menu e registrar treino pelo botao.');
                await replyMika(this.bot, msg.chat.id, response.message);
            } },
            { regex: /^\/status(@\w+)?$/, handler: (msg: Message) => handleStatus(this.bot, msg) },
            { regex: /^\/checktreino(@\w+)?$/, handler: (msg: Message) => handleCheckTreino(this.bot, msg) },
            { regex: /^\/cardio(@\w+)?$/, handler: (msg: Message) => handleCardio(this.bot, msg) },
            { regex: /^\/relatorio(@\w+)?$/, handler: (msg: Message) => handleRelatorio(this.bot, msg) },
            { regex: /^\/hora(@\w+)?$/, handler: (msg: Message) => handleHora(this.bot, msg) },
            { regex: /^\/motivar(@\w+)?$/, handler: (msg: Message) => handleMotivar(this.bot, msg) },
            { regex: /^\/streak(@\w+)?$/, handler: (msg: Message) => handleStreak(this.bot, msg) },
            { regex: /^\/passos(@\w+)?(?:\s+(.+))?$/, handler: (msg: Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'steps', 'passos') },
            { regex: /^\/instante(@\w+)? (.+)/, handler: (msg: Message, match: RegExpExecArray) => handleInstante(this.bot, msg, match) },
            { regex: /^\/reset(@\w+)?$/, handler: (msg: Message) => handleReset(this.bot, msg) },
            { regex: /^\/pausar(@\w+)?(?:\s+(.+))?$/, handler: (msg: Message, match: RegExpExecArray) => handlePausar(this.bot, msg, match) },
            { regex: /^\/voltar(@\w+)?$/, handler: (msg: Message) => handleVoltar(this.bot, msg) },
            { regex: /^\/peso(@\w+)?(?:\s+(.+))?$/, handler: (msg: Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'weight', 'kg') },
            { regex: /^\/altura(@\w+)?(?:\s+(.+))?$/, handler: (msg: Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'height', 'cm') },
            { regex: /^\/gordura(@\w+)?(?:\s+(.+))?$/, handler: (msg: Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'body_fat', '%') },
            { regex: /^\/musculo(@\w+)?(?:\s+(.+))?$/, handler: (msg: Message, match: RegExpExecArray) => handleMetric(this.bot, msg, match, 'muscle_mass', '%') },
            { regex: /^\/meme(@\w+)?$/, handler: (msg: Message) => handleMeme(this.bot, msg, null) },
            { regex: /^\/meme(@\w+)? (.+)/, handler: (msg: Message, match: RegExpExecArray) => handleMeme(this.bot, msg, match) },
            { regex: /^\/sticker(@\w+)?$/, handler: (msg: Message) => handleSticker(this.bot, msg, null) },
            { regex: /^\/sticker(@\w+)? (.+)/, handler: (msg: Message, match: RegExpExecArray) => handleSticker(this.bot, msg, match) },
            { regex: /^\/gif(@\w+)? (.+)/, handler: (msg: Message, match: RegExpExecArray) => handleGif(this.bot, msg, match) },
            { regex: /^\/(cantada|xaveco)(@\w+)?$/, handler: (msg: Message) => handleCantada(this.bot, msg) }
        ];

        const processCommand = async (msg: Message) => {
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
