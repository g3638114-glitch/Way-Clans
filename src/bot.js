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
    console.log('🔄 Initializing database tables...');

    // Seed building configs if empty
    const { data: configs } = await supabase.from('building_configs').select('*');

    if (!configs || configs.length === 0) {
      const buildingConfigs = [
        { building_type: 'mine', name: 'Шахта', emoji: '⛏', resource_type: 'gold', base_production: 50, cost_gold: 1000, cost_stone: 500, cost_wood: 300, cost_meat: 100 },
        { building_type: 'quarry', name: 'Каменоломня', emoji: '⛏', resource_type: 'stone', base_production: 40, cost_gold: 800, cost_stone: 400, cost_wood: 200, cost_meat: 80 },
        { building_type: 'sawmill', name: 'Лесопилка', emoji: '🌲', resource_type: 'wood', base_production: 45, cost_gold: 900, cost_stone: 450, cost_wood: 250, cost_meat: 90 },
        { building_type: 'farm', name: 'Ферма', emoji: '🍖', resource_type: 'meat', base_production: 20, cost_gold: 600, cost_stone: 300, cost_wood: 150, cost_meat: 50 },
      ];

      await supabase.from('building_configs').insert(buildingConfigs);
      console.log('✅ Building configs seeded');
    }

    console.log('✅ Database initialized');
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
          gold: 5000,
          wood: 2500,
          stone: 2500,
          meat: 500,
          jabcoins: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
      } else {
        user = newUser;

        // Create initial buildings for new user
        await supabase.from('buildings').insert([
          { user_id: user.id, building_type: 'mine', level: 1 },
          { user_id: user.id, building_type: 'quarry', level: 1 },
          { user_id: user.id, building_type: 'sawmill', level: 1 },
          { user_id: user.id, building_type: 'farm', level: 1 },
        ]);
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
