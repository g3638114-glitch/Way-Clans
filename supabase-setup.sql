-- Way Clans Bot - Supabase Database Setup
-- Execute this SQL in Supabase SQL Editor to create all necessary tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  
  -- Resources
  gold BIGINT DEFAULT 120000,
  wood BIGINT DEFAULT 50000,
  stone BIGINT DEFAULT 30000,
  meat BIGINT DEFAULT 10000,
  jabcoins BIGINT DEFAULT 3,
  
  -- User stats
  level INT DEFAULT 1,
  experience BIGINT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on telegram_id for faster lookups
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- Create transactions table for tracking resource exchanges
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50), -- 'sell_resources', 'exchange_gold', 'attack_reward', etc.
  
  gold_change BIGINT DEFAULT 0,
  wood_change BIGINT DEFAULT 0,
  stone_change BIGINT DEFAULT 0,
  meat_change BIGINT DEFAULT 0,
  jabcoins_change BIGINT DEFAULT 0,
  
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Create battles table for tracking player attacks
CREATE TABLE IF NOT EXISTS battles (
  id BIGSERIAL PRIMARY KEY,
  attacker_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  defender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  result VARCHAR(50), -- 'win', 'lose', 'draw'
  gold_stolen BIGINT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on attacker and defender
CREATE INDEX idx_battles_attacker_id ON battles(attacker_id);
CREATE INDEX idx_battles_defender_id ON battles(defender_id);

-- Enable Row Level Security (RLS) for security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Create a policy allowing users to read only their own data
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (true); -- In production, add proper authentication

-- Create a policy allowing users to update only their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true); -- In production, add proper authentication

-- Create a policy for transactions
CREATE POLICY "Users can read their own transactions" ON transactions
  FOR SELECT USING (true); -- In production, add proper authentication

-- Create a policy for battles
CREATE POLICY "Users can read their battles" ON battles
  FOR SELECT USING (true); -- In production, add proper authentication

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE
    ON users FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some test data (optional)
INSERT INTO users (telegram_id, username, first_name, gold, wood, stone, meat, jabcoins)
VALUES (123456789, 'testuser', 'Test', 120000, 50000, 30000, 10000, 3)
ON CONFLICT (telegram_id) DO NOTHING;
