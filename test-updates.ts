import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('No token');
const bot = new TelegramBot(token, { polling: false });

bot.getUpdates({ limit: 100 }).then(updates => {
    console.log(`Found ${updates.length} updates`);
    updates.forEach(u => {
        if (u.message) {
            console.log(`Msg from ${u.message.from?.first_name}: ${u.message.text} at ${new Date(u.message.date * 1000).toISOString()}`);
        }
    });
}).catch(console.error);
