import pkg from 'pg';

const { Client } = pkg;

const migrations = [
  // === USERS TABLE ===
  {
    name: 'Create users table',
    sql: `CREATE TABLE IF NOT EXISTS users (
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
  },
  {
    name: 'Add troop levels to users',
    sql: `ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS attacker_level INT DEFAULT 1,
          ADD COLUMN IF NOT EXISTS defender_level INT DEFAULT 1;`,
  },
  {
    name: 'Add other missing columns to users',
    sql: `ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS photo_url TEXT,
          ADD COLUMN IF NOT EXISTS jamcoins_from_clicks BIGINT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS treasury_level INT DEFAULT 1,
          ADD COLUMN IF NOT EXISTS warehouse_level INT DEFAULT 1,
          ADD COLUMN IF NOT EXISTS shield_until TIMESTAMP WITH TIME ZONE;`,
  },

  // === USER_TROOPS TABLE ===
  {
    name: 'Create user_troops table',
    sql: `CREATE TABLE IF NOT EXISTS user_troops (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      troop_type TEXT NOT NULL, -- 'attacker' or 'defender'
      level INT NOT NULL,
      count BIGINT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, troop_type, level)
    );`,
  },

  // === USER_BUILDINGS TABLE ===
  {
    name: 'Create user_buildings table',
    sql: `CREATE TABLE IF NOT EXISTS user_buildings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      building_type TEXT NOT NULL,
      building_number INT NOT NULL,
      level INT DEFAULT 1,
      collected_amount BIGINT DEFAULT 0,
      production_rate BIGINT DEFAULT 100,
      last_activated TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, building_type, building_number)
    );`,
  },

  // === COMPLETED_QUESTS TABLE ===
  {
    name: 'Create completed_quests table',
    sql: `CREATE TABLE IF NOT EXISTS completed_quests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id TEXT NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, quest_id)
    );`,
  },

  // === MARKET_LISTINGS TABLE ===
  {
    name: 'Create market_listings table',
    sql: `CREATE TABLE IF NOT EXISTS market_listings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      quantity BIGINT NOT NULL,
      price_per_unit BIGINT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
  },
  {
    name: 'Create market_sales table',
    sql: `CREATE TABLE IF NOT EXISTS market_sales (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      quantity BIGINT NOT NULL,
      price_per_unit BIGINT NOT NULL,
      total_price BIGINT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
  },

  // === DISABLE ROW LEVEL SECURITY ===
  {
    name: 'Disable RLS on all tables',
    sql: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;
          ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;
          ALTER TABLE completed_quests DISABLE ROW LEVEL SECURITY;
          ALTER TABLE market_listings DISABLE ROW LEVEL SECURITY;
          ALTER TABLE user_troops DISABLE ROW LEVEL SECURITY;`,
  },
  {
    name: 'Add indexes for hot paths',
    sql: `CREATE INDEX IF NOT EXISTS idx_users_shield_until ON users(shield_until);
          CREATE INDEX IF NOT EXISTS idx_user_buildings_user_id ON user_buildings(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_troops_user_id ON user_troops(user_id);
          CREATE INDEX IF NOT EXISTS idx_market_listings_resource_type ON market_listings(resource_type);
          CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id);
          CREATE INDEX IF NOT EXISTS idx_market_sales_seller_id ON market_sales(seller_id);`,
  },
  {
    name: 'Add non-negative constraints',
    sql: `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_gold_non_negative;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_wood_non_negative;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_stone_non_negative;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_meat_non_negative;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_jabcoins_non_negative;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_jamcoins_from_clicks_non_negative;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_treasury_level_positive;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_warehouse_level_positive;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_attacker_level_positive;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_defender_level_positive;
          ALTER TABLE user_troops DROP CONSTRAINT IF EXISTS chk_user_troops_count_non_negative;
          ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_level_positive;
          ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_collected_amount_non_negative;
          ALTER TABLE market_listings DROP CONSTRAINT IF EXISTS chk_market_listings_quantity_positive;
          ALTER TABLE market_listings DROP CONSTRAINT IF EXISTS chk_market_listings_price_positive;
          ALTER TABLE users ADD CONSTRAINT chk_users_gold_non_negative CHECK (gold >= 0);
          ALTER TABLE users ADD CONSTRAINT chk_users_wood_non_negative CHECK (wood >= 0);
          ALTER TABLE users ADD CONSTRAINT chk_users_stone_non_negative CHECK (stone >= 0);
          ALTER TABLE users ADD CONSTRAINT chk_users_meat_non_negative CHECK (meat >= 0);
          ALTER TABLE users ADD CONSTRAINT chk_users_jabcoins_non_negative CHECK (jabcoins >= 0);
          ALTER TABLE users ADD CONSTRAINT chk_users_jamcoins_from_clicks_non_negative CHECK (jamcoins_from_clicks >= 0);
          ALTER TABLE users ADD CONSTRAINT chk_users_treasury_level_positive CHECK (treasury_level >= 1);
          ALTER TABLE users ADD CONSTRAINT chk_users_warehouse_level_positive CHECK (warehouse_level >= 1);
          ALTER TABLE users ADD CONSTRAINT chk_users_attacker_level_positive CHECK (attacker_level >= 1);
          ALTER TABLE users ADD CONSTRAINT chk_users_defender_level_positive CHECK (defender_level >= 1);
          ALTER TABLE user_troops ADD CONSTRAINT chk_user_troops_count_non_negative CHECK (count >= 0);
          ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_level_positive CHECK (level >= 1);
          ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_collected_amount_non_negative CHECK (collected_amount >= 0);
          ALTER TABLE market_listings ADD CONSTRAINT chk_market_listings_quantity_positive CHECK (quantity > 0);
          ALTER TABLE market_listings ADD CONSTRAINT chk_market_listings_price_positive CHECK (price_per_unit > 0);`,
  },
  {
    name: 'Add referral columns and index',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_telegram_id BIGINT;
          CREATE INDEX IF NOT EXISTS idx_users_referred_by_telegram_id ON users(referred_by_telegram_id);`,
  },
  {
    name: 'Add pending market gold',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS market_pending_gold BIGINT DEFAULT 0;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_market_pending_gold_non_negative;
          ALTER TABLE users ADD CONSTRAINT chk_users_market_pending_gold_non_negative CHECK (market_pending_gold >= 0);`,
  },
  {
    name: 'Add ads columns and sessions',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS mining_ad_progress BIGINT DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS mining_ad_required BOOLEAN DEFAULT FALSE;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_mining_ad_progress_non_negative;
          ALTER TABLE users ADD CONSTRAINT chk_users_mining_ad_progress_non_negative CHECK (mining_ad_progress >= 0);
          CREATE TABLE IF NOT EXISTS ad_reward_sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_type TEXT NOT NULL,
            building_id UUID REFERENCES user_buildings(id) ON DELETE CASCADE,
            resource_type TEXT,
            collected_amount BIGINT DEFAULT 0,
            remaining_amount BIGINT DEFAULT 0,
            ad_confirmed_at TIMESTAMP WITH TIME ZONE,
            claimed_at TIMESTAMP WITH TIME ZONE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_ad_reward_sessions_user_type ON ad_reward_sessions(user_id, session_type, created_at DESC);`,
  },
  {
    name: 'Add mine worker fields',
    sql: `ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS worker_count INT DEFAULT 0;
          ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMP WITH TIME ZONE;
          ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS work_ends_at TIMESTAMP WITH TIME ZONE;
          ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS work_mode TEXT;
          ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_worker_count_non_negative;
          ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_worker_count_non_negative CHECK (worker_count >= 0);`,
  },
  {
    name: 'Add mining energy fields',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS energy INT DEFAULT 600;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS energy_capacity INT DEFAULT 600;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_energy_reset DATE DEFAULT CURRENT_DATE;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_energy_non_negative;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_energy_capacity_positive;
           ALTER TABLE users ADD CONSTRAINT chk_users_energy_non_negative CHECK (energy >= 0);
           ALTER TABLE users ADD CONSTRAINT chk_users_energy_capacity_positive CHECK (energy_capacity > 0);`,
  },
  {
    name: 'Add extra economy guardrails',
    sql: `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_referral_count_non_negative;
          ALTER TABLE users ADD CONSTRAINT chk_users_referral_count_non_negative CHECK (referral_count >= 0);
          ALTER TABLE user_troops DROP CONSTRAINT IF EXISTS chk_user_troops_level_positive;
          ALTER TABLE user_troops DROP CONSTRAINT IF EXISTS chk_user_troops_type_valid;
          ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_building_number_positive;
          ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_type_valid;
          ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_work_mode_valid;
          ALTER TABLE ad_reward_sessions DROP CONSTRAINT IF EXISTS chk_ad_reward_sessions_collected_amount_non_negative;
          ALTER TABLE ad_reward_sessions DROP CONSTRAINT IF EXISTS chk_ad_reward_sessions_remaining_amount_non_negative;
          ALTER TABLE ad_reward_sessions DROP CONSTRAINT IF EXISTS chk_ad_reward_sessions_type_not_blank;
          ALTER TABLE market_sales DROP CONSTRAINT IF EXISTS chk_market_sales_quantity_positive;
          ALTER TABLE market_sales DROP CONSTRAINT IF EXISTS chk_market_sales_price_positive;
          ALTER TABLE market_sales DROP CONSTRAINT IF EXISTS chk_market_sales_total_price_non_negative;
          ALTER TABLE user_troops ADD CONSTRAINT chk_user_troops_level_positive CHECK (level >= 1);
          ALTER TABLE user_troops ADD CONSTRAINT chk_user_troops_type_valid CHECK (troop_type IN ('attacker', 'defender'));
          ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_building_number_positive CHECK (building_number >= 1);
          ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_type_valid CHECK (building_type IN ('mine', 'quarry', 'lumber_mill', 'farm'));
          ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_work_mode_valid CHECK (work_mode IS NULL OR work_mode IN ('meat_100', 'ad_300'));
          ALTER TABLE ad_reward_sessions ADD CONSTRAINT chk_ad_reward_sessions_collected_amount_non_negative CHECK (collected_amount >= 0);
          ALTER TABLE ad_reward_sessions ADD CONSTRAINT chk_ad_reward_sessions_remaining_amount_non_negative CHECK (remaining_amount >= 0);
          ALTER TABLE ad_reward_sessions ADD CONSTRAINT chk_ad_reward_sessions_type_not_blank CHECK (length(trim(session_type)) > 0);
          ALTER TABLE market_sales ADD CONSTRAINT chk_market_sales_quantity_positive CHECK (quantity > 0);
          ALTER TABLE market_sales ADD CONSTRAINT chk_market_sales_price_positive CHECK (price_per_unit > 0);
          ALTER TABLE market_sales ADD CONSTRAINT chk_market_sales_total_price_non_negative CHECK (total_price >= 0);`,
  },
  {
    name: 'Create withdrawals table',
    sql: `CREATE TABLE IF NOT EXISTS withdrawals (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            telegram_id BIGINT NOT NULL,
            amount_jabcoins BIGINT NOT NULL,
            amount_rub BIGINT NOT NULL,
            method TEXT NOT NULL,
            destination_raw TEXT NOT NULL,
            destination_masked TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            admin_actor_telegram_id BIGINT,
            admin_actor_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE
          );
          CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status, created_at DESC);
          ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS chk_withdrawals_amount_positive;
          ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS chk_withdrawals_rub_positive;
          ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS chk_withdrawals_method_valid;
          ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS chk_withdrawals_status_valid;
          ALTER TABLE withdrawals ADD CONSTRAINT chk_withdrawals_amount_positive CHECK (amount_jabcoins > 0);
          ALTER TABLE withdrawals ADD CONSTRAINT chk_withdrawals_rub_positive CHECK (amount_rub > 0);
          ALTER TABLE withdrawals ADD CONSTRAINT chk_withdrawals_method_valid CHECK (method IN ('card', 'usdt_trc20'));
          ALTER TABLE withdrawals ADD CONSTRAINT chk_withdrawals_status_valid CHECK (status IN ('pending', 'completed', 'refunded'));`,
  },
];

async function executeMigrations(client) {
  const successfulMigrations = [];
  const failedMigrations = [];

  for (const migration of migrations) {
    try {
      await client.query(migration.sql);
      successfulMigrations.push(migration.name);
      console.log(`✅ ${migration.name}`);
    } catch (error) {
      failedMigrations.push({
        name: migration.name,
        error: error.message,
      });
      console.warn(`⚠️  ${migration.name}: ${error.message}`);
    }
  }

  return {
    successful: successfulMigrations.length,
    failed: failedMigrations.length,
    details: failedMigrations,
  };
}

export async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📦 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    console.log('\n🔄 Running database migrations...');
    const result = await executeMigrations(client);

    console.log(
      `\n✅ Migrations completed! (${result.successful} successful, ${result.failed} warnings)`
    );

    return {
      success: true,
      migrationsRun: result.successful,
      warnings: result.failed,
    };
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    await client.end();
  }
}
