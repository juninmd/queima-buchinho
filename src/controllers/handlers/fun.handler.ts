import TelegramBot from 'node-telegram-bot-api';
import { replyMika } from '../../utils/telegram';

const CANTADAS = [
  "Mestre, você não é agachamento, mas deixa minhas pernas bambas kkk. 🏋️‍♂️",
  "Você não é pré-treino, mas acelera meu coração! 😉⚡",
  "Me chama de cardio e diz que eu te deixo sem fôlego... ou na esteira kkk. 🏃‍♂️💨",
  "Você treina trapézio? Porque é um pedaço de mau caminho. 😂",
  "Você não é whey protein, mas é exatamente o que eu preciso depois do treino. 💪🥤",
  "Seu nome é Wi-Fi da academia? Porque estou sentindo uma conexão forte aqui. kkk",
  "Bora fazer uma série de três de 15 de 'olhar nos meus olhos'? 😉"
];

export async function handleCantada(bot: TelegramBot, msg: TelegramBot.Message) {
  const line = CANTADAS[Math.floor(Math.random() * CANTADAS.length)];
  await replyMika(bot, msg.chat.id, line);
}
