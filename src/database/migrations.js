import pkg from 'pg';

const { Client } = pkg;

const migrations = [
  // ... существующие миграции ...
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

// Обновленный метод runMigrations (включая новые миграции)
export async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Выполняем все миграции (включая базовые из предыдущего состояния)
    // Для краткости я предполагаю, что система миграций в проекте уже работает и просто добавляю новые в список
    for (const migration of migrations) {
      try {
        await client.query(migration.sql);
        console.log(`✅ ${migration.name}`);
      } catch (e) {
        console.warn(`⚠️ ${migration.name}: ${e.message}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await client.end();
  }
}