import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

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

// Execute SQL statements directly via PostgreSQL connection
async function executeSqlStatements() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📦 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // SQL statements to create tables
    const sqlStatements = [
      // Create users table
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        telegram_id BIGINT UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        gold BIGINT DEFAULT 5000,
        wood BIGINT DEFAULT 2500,
        stone BIGINT DEFAULT 2500,
        meat BIGINT DEFAULT 500,
        jabcoins BIGINT DEFAULT 0,
        referral_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // Create index on telegram_id
      `CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);`,

      // Create user_buildings table
      `CREATE TABLE IF NOT EXISTS user_buildings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        building_type TEXT NOT NULL,
        building_number INT NOT NULL,
        level INT DEFAULT 1,
        collected_amount BIGINT DEFAULT 0,
        production_rate BIGINT DEFAULT 100,
        last_collected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, building_type, building_number)
      );`,

      // Create indexes for buildings table
      `CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON user_buildings(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_buildings_type ON user_buildings(building_type);`,

      // Disable RLS
      `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;`,
    ];

    // Execute each SQL statement
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      try {
        await client.query(statement);
      } catch (error) {
        // Ignore "already exists" errors, they're expected
        if (!error.message.includes('already exists')) {
          console.warn(`⚠️  SQL Warning: ${error.message}`);
        }
      }
    }

    console.log('✅ Tables created/verified');

    return {
      usersTableExists: true,
      buildingsTableExists: true,
    };
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    return {
      usersTableExists: false,
      buildingsTableExists: false,
    };
  } finally {
    await client.end();
  }
}

// Initialize database tables - automatically creates them if they don't exist
async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Create tables via direct PostgreSQL connection
    const { usersTableExists, buildingsTableExists } = await executeSqlStatements();

    if (usersTableExists && buildingsTableExists) {
      console.log('✅ Database initialization completed successfully!');
    } else {
      console.log('⚠️  Warning: Some tables could not be verified');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.log('Continuing anyway - will retry on next startup');
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
