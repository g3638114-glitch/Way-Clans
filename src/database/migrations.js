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
          CREATE INDEX IF NOT EXISTS idx_market_listings_seller_id ON market_listings(seller_id);`,
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
