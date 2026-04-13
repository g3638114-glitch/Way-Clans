-- Create users table
CREATE TABLE IF NOT EXISTS users (
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
);

-- Create index on telegram_id for faster queries
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Create user_buildings table
CREATE TABLE IF NOT EXISTS user_buildings (
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
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON user_buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON user_buildings(building_type);

-- Create completed_quests table to track which quests user has completed
CREATE TABLE IF NOT EXISTS completed_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quest_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_completed_quests_user_id ON completed_quests(user_id);

-- Disable RLS on tables (bot handles access control via Telegram)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE completed_quests DISABLE ROW LEVEL SECURITY;
