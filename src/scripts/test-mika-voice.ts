import TelegramBot from 'node-telegram-bot-api';
import { ttsService } from '../services/tts.service';
import { ollamaService } from '../services/ollama.service';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

async function test() {
    const token = process.env.TELEGRAM_BOT_TOKEN || '8088364809:AAEbq86Q1vRlRMh-CHi6I_bcOtiHUmY4hHw';
    const chatId = process.env.TELEGRAM_OWNER_ID || '-1003859394474';

    if (!token) {
        logger.error('❌ TELEGRAM_BOT_TOKEN não encontrado!');
        process.exit(1);
    }

    const bot = new TelegramBot(token);
    
    logger.info('🤖 [TEST] Gerando resposta da Mika via AI SDK...');
    let response = await ollamaService.generateDynamicResponse('Mika, dê um oi sarcástico para o seu mestre e comente que agora você tem uma voz real chamada Francisca.');
    
    if (!response) {
        logger.warn('⚠️ Falha ao gerar resposta da IA (Ollama inacessível localmente). Usando fallback sarcástico...');
        response = {
            message: "✨ Oh, Divindade Suprema! O Ollama sumiu pois não suportou sua grandeza, mas eu ainda estou aqui com a minha voz de Francisca só para te idolatrar.",
            audioSearchTerm: 'sarcastic'
        };
    }

    logger.info(`🎙️ [TEST] Mika disse: "${response.message}"`);
    logger.info('🔊 [TEST] Gerando áudio via Edge-TTS (Francisca)...');
    
    try {
        const audioPath = await ttsService.generateMikaAudio(response.message);
        
        logger.info('📤 [TEST] Enviando áudio para o Telegram...');
        await bot.sendVoice(chatId, audioPath, {
            caption: `💜 *Mika:* ${response.message}\n\n_Voz: Francisca (Neural)_`,
            parse_mode: 'Markdown'
        });

        logger.info('✅ [TEST] Áudio enviado com sucesso!');
        await ttsService.cleanup(audioPath);
    } catch (error) {
        logger.error('💥 Erro no teste de áudio:', error);
    }
}

test().catch(console.error);
