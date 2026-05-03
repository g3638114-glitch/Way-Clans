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
  worker_count INT DEFAULT 0,
  work_started_at TIMESTAMP WITH TIME ZONE,
  work_ends_at TIMESTAMP WITH TIME ZONE,
  work_mode TEXT,
  building_collect_x2_cooldown_until TIMESTAMP WITH TIME ZONE,
  building_speedup_1h_cooldown_until TIMESTAMP WITH TIME ZONE,
  mine_ad_300_cooldown_until TIMESTAMP WITH TIME ZONE,
  mine_finish_now_cooldown_until TIMESTAMP WITH TIME ZONE,
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

CREATE TABLE IF NOT EXISTS withdrawals (
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

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_gold_non_negative;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_wood_non_negative;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_stone_non_negative;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_meat_non_negative;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_jabcoins_non_negative;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_referral_count_non_negative;
ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_building_number_positive;
ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_level_positive;
ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS chk_user_buildings_collected_amount_non_negative;
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS chk_withdrawals_amount_positive;
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS chk_withdrawals_rub_positive;
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS chk_withdrawals_method_valid;
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS chk_withdrawals_status_valid;
ALTER TABLE users ADD CONSTRAINT chk_users_gold_non_negative CHECK (gold >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_wood_non_negative CHECK (wood >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_stone_non_negative CHECK (stone >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_meat_non_negative CHECK (meat >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_jabcoins_non_negative CHECK (jabcoins >= 0);
ALTER TABLE users ADD CONSTRAINT chk_users_referral_count_non_negative CHECK (referral_count >= 0);
ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_building_number_positive CHECK (building_number >= 1);
ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_level_positive CHECK (level >= 1);
ALTER TABLE user_buildings ADD CONSTRAINT chk_user_buildings_collected_amount_non_negative CHECK (collected_amount >= 0);
ALTER TABLE withdrawals ADD CONSTRAINT chk_withdrawals_amount_positive CHECK (amount_jabcoins > 0);
ALTER TABLE withdrawals ADD CONSTRAINT chk_withdrawals_rub_positive CHECK (amount_rub > 0);
ALTER TABLE withdrawals ADD CONSTRAINT chk_withdrawals_method_valid CHECK (method IN ('card', 'sbp', 'mobile', 'usdt_trc20'));
ALTER TABLE withdrawals ADD CONSTRAINT chk_withdrawals_status_valid CHECK (status IN ('pending', 'completed', 'refunded'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_completed_quests_user_id ON completed_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status, created_at DESC);

-- Disable RLS on tables (bot handles access control via Telegram)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE completed_quests DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
