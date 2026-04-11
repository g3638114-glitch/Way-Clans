import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize bot and Supabase
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Create available buildings templates that users can purchase
// These are not added to users by default, but available for purchase
// Production rates are per HOUR
const AVAILABLE_BUILDINGS = [
  { type: 'mine', maxCount: 5, productionRate: 80, baseCost: 0 }, // First mine is free
  { type: 'quarry', maxCount: 5, productionRate: 60, baseCost: 50000 },
  { type: 'lumber_mill', maxCount: 5, productionRate: 50, baseCost: 40000 },
  { type: 'farm', maxCount: 5, productionRate: 40, baseCost: 30000 },
];

// Create initial buildings for a new user (free buildings: mine, quarry, lumber_mill, farm)
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

    // Create 4 initial free buildings (not added yet, only available to purchase)
    // They will be created as "locked" cards that the user can buy for free
    console.log(`✅ User ${user.id} created. Free buildings available for purchase: mine, quarry, lumber_mill, farm`);
  } catch (error) {
    console.error('Error creating initial buildings:', error);
  }
}

// Create tables via SQL if they don't exist
async function createTablesIfNeeded() {
  try {
    console.log('🔄 Checking database tables...');

    // Verify tables exist by attempting to query them
    const { error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    const { error: buildingsError } = await supabase
      .from('user_buildings')
      .select('id')
      .limit(1);

    // If both tables exist (or are empty which is also valid), we're good
    if (!usersError || usersError.code !== 'PGRST116') {
      if (!buildingsError || buildingsError.code !== 'PGRST116') {
        console.log('✅ All required database tables verified and ready!');
        return true;
      }
    }

    // If we get here, at least one table is missing
    throw new Error('One or more tables are missing');
  } catch (error) {
    console.error('\n⚠️  ERROR: Database tables not found!');
    console.log('\n📋 SOLUTION: Create these tables in your Supabase Dashboard:');
    console.log('━'.repeat(80));
    console.log(`
1. Go to https://app.supabase.com
2. Select your project
3. Go to "SQL Editor"
4. Click "New Query"
5. Copy and paste this SQL:

────────────────────────────────────────────────────────────────────────────────

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  gold BIGINT DEFAULT 5000,
  wood BIGINT DEFAULT 2500,
  stone BIGINT DEFAULT 2500,
  meat BIGINT DEFAULT 500,
  jabcoins BIGINT DEFAULT 0,
  referral_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_buildings table
CREATE TABLE IF NOT EXISTS public.user_buildings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL,
  building_number INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  collected_amount BIGINT DEFAULT 0,
  production_rate BIGINT NOT NULL,
  last_collected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, building_type, building_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_buildings_user_id ON public.user_buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_buildings_type ON public.user_buildings(building_type);

────────────────────────────────────────────────────────────────────────────────

6. Click "Run" (CMD+Enter or CTRL+Enter)
7. Restart your application

⏳ The application will continue to run, but features will not work until tables are created.
    `);
    console.log('━'.repeat(80) + '\n');
  }
}

// Initialize Supabase tables
async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');
    await createTablesIfNeeded();
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
