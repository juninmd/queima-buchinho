import * as fs from 'fs';
import * as path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import { getBrasiliaDayStart, getBrasiliaDateString } from '../utils/time';

const HISTORY_FILE = path.join(__dirname, '../../data/workout-history.json');

// Interface para o registro de histórico
interface WorkoutLogEntry {
    date: string; // ISO string with timezone
    userId: number;
    userMessage: string;
}

export class WorkoutService {

    // Palavras-chave para validar treino
    private WORKOUT_KEYWORDS = ['eu treinei', 'treinei', 'treinado'];

    /**
     * Verifica se houve treino HOJE olhando o histórico de mensagens do bot.
     * Filtra mensagens a partir de 00:00 (Brasília) do dia atual.
     */
    public async checkDailyMessages(bot: TelegramBot): Promise<{ trained: boolean; message?: TelegramBot.Message }> {
        try {
            console.log('🔍 Buscando atualizações de mensagens...');

            // Busca updates. Offset -100 arbitrário para pegar últimas mensagens?
            // Na verdade, precisamos garantir que pegamos mensagens do dia.
            // Se o bot não estiver rodando, getUpdates pode retornar mensagens acumuladas.
            // Limit 100 é o máximo por requisição.
            const updates = await bot.getUpdates({ limit: 100 });

            const todayStart = getBrasiliaDayStart();
            console.log(`📅 Verificando mensagens a partir de: ${todayStart.toISOString()}`);

            let trainedMessage: TelegramBot.Message | undefined;

            // Iterar de trás pra frente ou frente pra trás?
            // Queremos saber se *alguma* mensagem válida existe.
            for (const update of updates) {
                if (update.message) {
                    const msg = update.message;
                    const msgDate = new Date(msg.date * 1000); // timestamp is seconds

                    // Verificar se é de hoje
                    if (msgDate >= todayStart) {
                        const text = msg.text || '';
                        // Verificar keywords e se é do usuário principal (chatId no env) ou qualquer user?
                        // A lógica original focava no chatId principal, mas aqui vamos validar o conteúdo.
                        // O filtro de usuário será feito pelo caller (SchedulerService) ou aqui?
                        // Se o objetivo é saber se "eu" (dono do bot) treinei, validamos o ID depois ou filtramos agora.
                        // Vamos retornar se achou mensagem de treino válida.

                        if (this.hasWorkoutKeyword(text)) {
                            console.log(`✅ Mensagem de treino encontrada: "${text}" de ${msg.from?.first_name} às ${msgDate.toISOString()}`);
                            trainedMessage = msg;
                            // Se achou um, já é suficiente.
                            // Mas pode haver polêmica se outra pessoa mandar msg no grupo.
                            // Vamos assumir que validaremos o ID no scheduler ou aqui se passarmos o targetUserId.
                        }
                    }
                }
            }

            return { trained: !!trainedMessage, message: trainedMessage };

        } catch (error) {
            console.error('Erro ao buscar mensagens:', error);
            return { trained: false };
        }
    }

    private hasWorkoutKeyword(text: string): boolean {
        const lowerText = text.toLowerCase();
        return this.WORKOUT_KEYWORDS.some(keyword => lowerText.includes(keyword));
    }

    /**
     * Registra o treino no arquivo de histórico (append).
     */
    public logWorkout(userId: number, userMessage: string) {
        try {
            const dataDir = path.dirname(HISTORY_FILE);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            let history: WorkoutLogEntry[] = [];
            if (fs.existsSync(HISTORY_FILE)) {
                const fileContent = fs.readFileSync(HISTORY_FILE, 'utf8');
                try {
                    history = JSON.parse(fileContent);
                } catch (e) {
                    console.error('Erro ao fazer parse do histórico, criando novo.', e);
                }
            }

            // Evitar duplicidade do dia? O usuário pediu log. Se rodar 2x, loga 2x?
            // Melhor evitar duplicar o mesmo dia para o mesmo usuário.
            const todayDateString = getBrasiliaDateString();
            const alreadyLogged = history.some(h =>
                h.userId === userId && h.date.startsWith(todayDateString)
            );

            if (alreadyLogged) {
                console.log('📝 Treino já registrado no histórico hoje.');
                return;
            }

            const entry: WorkoutLogEntry = {
                date: new Date().toISOString(), // Grava hora exata do check ou da mensagem? O requisito diz "data/hora e o que treinei". Vamos usar hora atual do check ou a msg?
                // O requisito diz "Ao verificar que treinei... adicionar o registro".
                userId,
                userMessage
            };

            history.push(entry);

            fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
            console.log('💾 Treino registrado no histórico com sucesso.');

        } catch (error) {
            console.error('Erro ao salvar histórico de treino:', error);
        }
    }

    // Métodos antigos removidos ou adaptados para não usar estado em memória volátil para validação
    // hasTrainedToday removido em favor de checkDailyMessages
    // markWorkout (memória) removido
    // resetWorkout removido (não faz sentido com histórico persistente append-only, ou deletaríamos a linha?)
    // Para fins de teste, talvez seja útil limpar, mas o requisito foca em guardar histórico.
    public resetWorkout(userId: number) {
        // Implementação opcional: remover entrada de hoje do JSON
        try {
            if (fs.existsSync(HISTORY_FILE)) {
                let history: WorkoutLogEntry[] = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
                const todayDateString = getBrasiliaDateString();
                const initialLength = history.length;
                history = history.filter(h => !(h.userId === userId && h.date.startsWith(todayDateString)));

                if (history.length < initialLength) {
                    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
                    console.log('🔄 Treino de hoje removido do histórico.');
                }
            }
        } catch (error) {
            console.error('Erro ao resetar histórico:', error);
        }
    }
}

export const workoutService = new WorkoutService();
