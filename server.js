const path = require('path');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');
const { Telegraf, Markup } = require('telegraf');
require('dotenv').config({ override: true });

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://way.clans.idlebat.online';
const DATABASE_URL = process.env.DATABASE_URL;
const db = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

const app = express();
app.use(express.static(__dirname));
app.locals.db = db;

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, database: Boolean(db), bot: Boolean(BOT_TOKEN) });
});

if (DATABASE_URL) {
  app.locals.databaseUrl = DATABASE_URL;
}

if (BOT_TOKEN) {
  const bot = new Telegraf(BOT_TOKEN);

  bot.start((ctx) => {
    return ctx.reply(
      'Добро пожаловать! Нажмите кнопку ниже, чтобы открыть MiniApp.',
      Markup.inlineKeyboard([
        Markup.button.webApp('Открыть MiniApp', WEBAPP_URL),
      ])
    );
  });

  bot.catch((error) => {
    console.error('Telegram bot error:', error);
  });

  bot.launch();

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  console.warn('BOT_TOKEN is not set. Telegram bot is disabled.');
}

app.listen(PORT, () => {
  console.log(`MiniApp server is running on port ${PORT}`);
});
