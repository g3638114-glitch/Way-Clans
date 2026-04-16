import pkg from 'pg';

const { Client } = pkg;

const migrations = [
  {
    name: 'Initial schema',
    sql: `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        telegram_id BIGINT UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        photo_url TEXT,
        gold BIGINT DEFAULT 5000,
        wood BIGINT DEFAULT 2500,
        stone BIGINT DEFAULT 2500,
        meat BIGINT DEFAULT 500,
        jabcoins BIGINT DEFAULT 0,
        jamcoins_from_clicks BIGINT DEFAULT 0,
        treasury_level INT DEFAULT 1,
        warehouse_level INT DEFAULT 1,
        referral_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_buildings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        building_type TEXT NOT NULL,
        building_number INT NOT NULL,
        level INT DEFAULT 1,
        collected_amount DOUBLE PRECISION DEFAULT 0,
        production_rate DOUBLE PRECISION,
        last_activated TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS market_listings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
        resource_type TEXT NOT NULL,
        quantity BIGINT NOT NULL,
        price_per_unit BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS completed_quests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        quest_id TEXT NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, quest_id)
      );
    `,
  },
  {
    name: 'Add warrior levels to users',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS attacker_level INT DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS defender_level INT DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS army_last_collected TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `,
  },
  {
    name: 'Create user_warriors table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_warriors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        warrior_type TEXT NOT NULL,
        level INT NOT NULL,
        quantity BIGINT DEFAULT 0,
        UNIQUE(user_id, warrior_type, level)
      );
    `,
  },
  {
    name: 'Create index on user_warriors',
    sql: `CREATE INDEX IF NOT EXISTS idx_user_warriors_user_id ON user_warriors(user_id);`,
  },
  {
    name: 'Disable RLS on user_warriors',
    sql: `ALTER TABLE user_warriors DISABLE ROW LEVEL SECURITY;`,
  }
];

export async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    let migrationsRun = 0;
    let warnings = 0;

    for (const migration of migrations) {
      try {
        await client.query(migration.sql);
        migrationsRun++;
        console.log(`✅ Migration applied: ${migration.name}`);
      } catch (e) {
        warnings++;
        console.warn(`⚠️ Migration warning (${migration.name}): ${e.message}`);
      }
    }

    return { success: true, migrationsRun, warnings };
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await client.end();
  }
}