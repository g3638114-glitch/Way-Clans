import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

/**
 * Available buildings templates that users can purchase
 * These are not added to users by default, but available for purchase
 * Production rates are per HOUR
 */
export const AVAILABLE_BUILDINGS = [
  { type: 'mine', maxCount: 5, productionRate: 80, baseCost: 0 }, // First mine is free
  { type: 'quarry', maxCount: 5, productionRate: 60, baseCost: 50000 },
  { type: 'lumber_mill', maxCount: 5, productionRate: 50, baseCost: 40000 },
  { type: 'farm', maxCount: 5, productionRate: 40, baseCost: 30000 },
];

/**
 * Initial user resources
 */
export const INITIAL_USER_RESOURCES = {
  gold: 5000,
  wood: 2500,
  stone: 2500,
  meat: 500,
  jabcoins: 0,
};

/**
 * Execute SQL statements directly via PostgreSQL connection
 */
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

      // Create completed_quests table for quest tracking
      `CREATE TABLE IF NOT EXISTS completed_quests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quest_id TEXT NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, quest_id)
      );`,

      // Create index for completed_quests
      `CREATE INDEX IF NOT EXISTS idx_completed_quests_user_id ON completed_quests(user_id);`,

      // Disable RLS
      `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE completed_quests DISABLE ROW LEVEL SECURITY;`,
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

/**
 * Initialize database tables - automatically creates them if they don't exist
 */
export async function initializeDatabase() {
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
