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
          ADD COLUMN IF NOT EXISTS warehouse_level INT DEFAULT 1;`,
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