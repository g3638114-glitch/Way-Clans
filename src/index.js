import app from './server.js';
import { bot, initializeDatabase } from './bot.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Initialize database
    await initializeDatabase();

    // Start Express server
    app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`MiniApp URL: ${process.env.MINIAPP_URL}`);

      // Set webhook for Telegram bot
      const webhookUrl = `${process.env.TELEGRAM_WEBHOOK_URL}/webhook`;
      try {
        await bot.telegram.setWebhook(webhookUrl);
        console.log(`Webhook set to: ${webhookUrl}`);
      } catch (error) {
        console.error('Failed to set webhook:', error.message);
      }
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

start();
