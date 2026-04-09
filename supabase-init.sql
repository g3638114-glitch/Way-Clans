-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  gold BIGINT DEFAULT 5000,
  wood BIGINT DEFAULT 2500,
  stone BIGINT DEFAULT 2500,
  meat BIGINT DEFAULT 500,
  jabcoins BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create building_configs table
CREATE TABLE IF NOT EXISTS building_configs (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  building_type TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  base_production INT NOT NULL,
  cost_gold INT DEFAULT 0,
  cost_stone INT DEFAULT 0,
  cost_wood INT DEFAULT 0,
  cost_meat INT DEFAULT 0
);

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL,
  level INT DEFAULT 1,
  collected_amount BIGINT DEFAULT 0,
  last_collected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, building_type)
);

-- Create production_logs table
CREATE TABLE IF NOT EXISTS production_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert building configs
INSERT INTO building_configs (building_type, name, emoji, resource_type, base_production, cost_gold, cost_stone, cost_wood, cost_meat)
VALUES 
  ('mine', 'Шахта', '⛏', 'gold', 50, 1000, 500, 300, 100),
  ('quarry', 'Каменоломня', '⛏', 'stone', 40, 800, 400, 200, 80),
  ('sawmill', 'Лесопилка', '🌲', 'wood', 45, 900, 450, 250, 90),
  ('farm', 'Ферма', '🍖', 'meat', 20, 600, 300, 150, 50)
ON CONFLICT (building_type) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for testing - в продакшене нужна аутентификация)
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Buildings are readable" ON buildings
  FOR SELECT USING (true);

CREATE POLICY "Buildings can be updated" ON buildings
  FOR UPDATE USING (true);

CREATE POLICY "Production logs readable" ON production_logs
  FOR SELECT USING (true);

CREATE POLICY "Production logs insertable" ON production_logs
  FOR INSERT WITH CHECK (true);
