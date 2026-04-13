-- ===== COMPLETE WAY CLANS SETUP =====
-- Run this entire script in Supabase SQL Editor

-- Step 1: Disable RLS on existing tables (if they exist)
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_buildings DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop RLS policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service can manage all" ON users;
DROP POLICY IF EXISTS "Users can view own buildings" ON user_buildings;
DROP POLICY IF EXISTS "Users can update own buildings" ON user_buildings;
DROP POLICY IF EXISTS "Service can manage all" ON user_buildings;

-- Step 3: Create users table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create user_buildings table
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

-- Step 5: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_buildings_user_id ON user_buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON user_buildings(building_type);

-- Step 6: Ensure RLS is disabled on both tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;

-- Verify the tables exist and RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('users', 'user_buildings');
