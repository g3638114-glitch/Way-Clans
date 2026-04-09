import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize bot and Supabase
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Create available buildings templates that users can purchase
// These are not added to users by default, but available for purchase
const AVAILABLE_BUILDINGS = [
  { type: 'mine', maxCount: 5, productionRate: 100, baseCost: 0 }, // First mine is free
  { type: 'quarry', maxCount: 5, productionRate: 80, baseCost: 50000 },
  { type: 'lumber_mill', maxCount: 5, productionRate: 60, baseCost: 40000 },
  { type: 'farm', maxCount: 5, productionRate: 40, baseCost: 30000 },
];

// Create initial buildings for a new user (deprecated - users now buy buildings)
async function createInitialBuildings(userId) {
  // No longer auto-create buildings. Users must purchase them.
  console.log(`✅ User ${userId} created. Buildings can now be purchased.`);
}

// Initialize Supabase tables
async function initializeDatabase() {
  try {
    // Verify users table exists by trying a query
    const { error: checkUsersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (checkUsersError && checkUsersError.code === 'PGRST116') {
      console.log('⚠️  Users table does not exist. Please create it in Supabase Dashboard.');
      console.log('Run the SQL commands in SUPABASE_SETUP.md');
    } else if (checkUsersError) {
      console.log('⚠️  Error checking users table:', checkUsersError.message);
    } else {
      console.log('✅ Users table verified');
    }

    // Verify buildings table exists
    const { error: checkBuildingsError } = await supabase
      .from('user_buildings')
      .select('id')
      .limit(1);

    if (checkBuildingsError && checkBuildingsError.code === 'PGRST116') {
      console.log('⚠️  User buildings table does not exist. Please create it in Supabase Dashboard.');
      console.log('Run the SQL commands in SUPABASE_SETUP.md');
    } else if (checkBuildingsError) {
      console.log('⚠️  Error checking buildings table:', checkBuildingsError.message);
    } else {
      console.log('✅ User buildings table verified');
    }

    console.log('✅ Database initialization check completed');
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
