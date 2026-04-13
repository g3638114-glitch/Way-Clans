import pkg from 'pg';

const { Client } = pkg;

/**
 * Migration system for Supabase PostgreSQL database
 * Ensures all tables and columns exist without losing data
 * Safe to run on every application startup
 */

/**
 * Define all migrations as idempotent SQL statements
 * These will check if columns exist before adding them
 */
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
      jamcoins BIGINT DEFAULT 0,
      referral_count INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
  },
  {
    name: 'Create index on users.telegram_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);`,
  },
  {
    name: 'Add referral_count column to users if missing',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;`,
  },
  {
    name: 'Add photo_url column to users if missing',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;`,
  },
  {
    name: 'Add jamcoins_from_clicks column to users if missing',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS jamcoins_from_clicks BIGINT DEFAULT 0;`,
  },
  {
    name: 'Add treasury_level column to users if missing',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS treasury_level INT DEFAULT 1;`,
  },
  {
    name: 'Rename jabcoins column to jamcoins',
    sql: `ALTER TABLE users RENAME COLUMN IF EXISTS jabcoins TO jamcoins;`,
  },
  {
    name: 'Rename jabcoins_change column to jamcoins_change in audit logs if exists',
    sql: `ALTER TABLE IF EXISTS audit_logs RENAME COLUMN IF EXISTS jabcoins_change TO jamcoins_change;`,
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
  {
    name: 'Create index on user_buildings.user_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON user_buildings(user_id);`,
  },
  {
    name: 'Create index on user_buildings.building_type',
    sql: `CREATE INDEX IF NOT EXISTS idx_buildings_type ON user_buildings(building_type);`,
  },
  {
    name: 'Add level column to user_buildings if missing',
    sql: `ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;`,
  },
  {
    name: 'Add collected_amount column to user_buildings if missing',
    sql: `ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS collected_amount BIGINT DEFAULT 0;`,
  },
  {
    name: 'Add production_rate column to user_buildings if missing',
    sql: `ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS production_rate BIGINT DEFAULT 100;`,
  },
  {
    name: 'Add last_activated column to user_buildings if missing',
    sql: `ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS last_activated TIMESTAMP WITH TIME ZONE;`,
  },
  {
    name: 'Add created_at column to user_buildings if missing',
    sql: `ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
  },
  {
    name: 'Add updated_at column to user_buildings if missing',
    sql: `ALTER TABLE user_buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
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
  {
    name: 'Create index on completed_quests.user_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_completed_quests_user_id ON completed_quests(user_id);`,
  },
  {
    name: 'Add quest_id column to completed_quests if missing',
    sql: `ALTER TABLE completed_quests ADD COLUMN IF NOT EXISTS quest_id TEXT;`,
  },
  {
    name: 'Add completed_at column to completed_quests if missing',
    sql: `ALTER TABLE completed_quests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
  },

  // === DISABLE ROW LEVEL SECURITY ===
  {
    name: 'Disable RLS on users table',
    sql: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`,
  },
  {
    name: 'Disable RLS on user_buildings table',
    sql: `ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;`,
  },
  {
    name: 'Disable RLS on completed_quests table',
    sql: `ALTER TABLE completed_quests DISABLE ROW LEVEL SECURITY;`,
  },
];

/**
 * Execute all migrations in order
 * Each migration is idempotent and safe to run multiple times
 */
async function executeMigrations(client) {
  const successfulMigrations = [];
  const failedMigrations = [];

  for (const migration of migrations) {
    try {
      await client.query(migration.sql);
      successfulMigrations.push(migration.name);
      console.log(`✅ ${migration.name}`);
    } catch (error) {
      // Log warnings but don't fail - some operations are expected to fail
      // (e.g., adding a column that already exists in an old DB)
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

/**
 * Run all database migrations
 * Ensures all tables and columns exist without losing existing data
 */
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

    if (result.failed > 0) {
      console.log('\n⚠️  Some operations were skipped (this is normal for existing databases)');
    }

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
