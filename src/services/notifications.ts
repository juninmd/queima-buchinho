import TelegramBot from 'node-telegram-bot-api';
import * as path from 'path';
import * as fs from 'fs/promises';

export class NotificationService {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  private getAssetPath(filename: string): string {
    // If running from src/services, we need to go up two levels to root, then to assets
    // If running from dist/services, same logic
    return path.join(__dirname, '../../assets', filename);
  }

  async sendMotivation(chatId: number, userId: number): Promise<void> {
    const audioPath = this.getAssetPath('motivation.mp3');
    const imagePath = this.getAssetPath('motivation.jpg');

    try {
      // Check if audio exists
      try {
        await fs.access(audioPath);
        await this.bot.sendVoice(chatId, audioPath, {
          caption: '🔥 Vamos lá! Não desista dos seus objetivos! 💪'
        });
      } catch {
        // Fallback to text if audio not found
        await this.bot.sendMessage(chatId, '🔥 Vamos lá! Não desista dos seus objetivos! 💪\n\nLembre-se: o treino de hoje é a força de amanhã!');
      }

      // Check if image exists
      try {
        await fs.access(imagePath);
        await this.bot.sendPhoto(chatId, imagePath, {
          caption: '💪 Você consegue! Não deixe para amanhã o treino de hoje!'
        });
      } catch {
        // Image optional, do nothing if missing
      }

      console.log(`Motivação enviada para usuário ${userId}`);
    } catch (error) {
      console.error('Erro ao enviar motivação:', error);
    }
  }

  async sendCongratulations(chatId: number, userId: number): Promise<void> {
    const congratsMessages = [
      '🎉 Parabéns! Você treinou hoje! Continue assim! 💪',
      '👏 Excelente! Mais um treino concluído! Você está arrasando! 🔥',
      '⭐ Incrível! Você está no caminho certo! Continue treinando! 💯',
      '🏆 Mandou bem! Treino feito é sucesso garantido! 💪'
    ];

    const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];

    try {
      await this.bot.sendMessage(chatId, randomMessage);
      console.log(`Parabenização enviada para usuário ${userId}`);
    } catch (error) {
      console.error('Erro ao enviar parabenização:', error);
    }
  }
}
