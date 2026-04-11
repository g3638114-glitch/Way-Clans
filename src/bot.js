import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init.js';

dotenv.config();

// Initialize bot and Supabase
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Create initial buildings for a new user (free buildings: mine, quarry, lumber_mill, farm)
 * Each player starts with 1 of each building type at level 1
 */
async function createInitialBuildings(userId) {
  try {
    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user for initial buildings:', userError);
      return;
    }

    // Create initial buildings: mine, quarry, lumber_mill, farm
    const buildingTypes = ['mine', 'quarry', 'lumber_mill', 'farm'];
    const productionRates = {
      mine: 100,
      quarry: 80,
      lumber_mill: 90,
      farm: 70,
    };

    const buildingsToCreate = buildingTypes.map((type) => ({
      user_id: user.id,
      building_type: type,
      building_number: 1,
      level: 1,
      collected_amount: 0,
      production_rate: productionRates[type],
      last_activated: null,
      created_at: new Date().toISOString(),
    }));

    const { data: createdBuildings, error: createError } = await supabase
      .from('user_buildings')
      .insert(buildingsToCreate)
      .select();

    if (createError) {
      console.error('Error creating initial buildings:', createError);
      return;
    }

    console.log(`✅ Created ${createdBuildings.length} initial buildings for user ${user.id}`);
  } catch (error) {
    console.error('Error creating initial buildings:', error);
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
      // User doesn't exist, create new with initial resources
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
        // Create initial buildings for the user
        await createInitialBuildings(user.id);
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
