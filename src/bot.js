import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize bot and Supabase
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Initialize Supabase tables
async function initializeDatabase() {
  try {
    // Check if tables exist, if not they will be created via Supabase dashboard
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Handle /start command
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'Unknown';
  const firstName = ctx.from.first_name || '';

  try {
    // Get or create user in Supabase
    let { data: user, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (selectError && selectError.code === 'PGRST116') {
      // User doesn't exist, create new
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: userId,
          username: username,
          first_name: firstName,
          gold: 120000,
          wood: 50000,
          stone: 30000,
          meat: 10000,
          jabcoins: 3,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
      } else {
        user = newUser;
      }
    } else if (selectError) {
      console.error('Error fetching user:', selectError);
    }

    // Send welcome message with MiniApp button
    const miniappUrl = `${process.env.MINIAPP_URL}?userId=${userId}`;

    await ctx.reply('🎮 Добро пожаловать в Way Clans!', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Открыть МiniApp',
              web_app: { url: miniappUrl },
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error('Error in /start command:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
});

// Handle unknown commands
bot.on('message', async (ctx) => {
  // Only respond to unknown messages
  if (!ctx.message.text?.startsWith('/')) {
    await ctx.reply('Используйте команду /start для начала игры.');
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  try {
    ctx.reply('Произошла ошибка. Попробуйте позже.').catch(() => {});
  } catch (e) {
    console.error('Error sending error message:', e);
  }
});

export { bot, supabase, initializeDatabase };
