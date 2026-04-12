# Supabase Setup Guide - Way Clans

This guide walks you through creating the necessary tables in Supabase for the Way Clans game.

## Step 1: Create the Users Table

In your Supabase dashboard, go to SQL Editor and run:

```sql
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

-- Create an index on telegram_id for faster queries
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

## Step 2: Create the User Buildings Table

```sql
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
CREATE INDEX idx_buildings_user_id ON user_buildings(user_id);
CREATE INDEX idx_buildings_type ON user_buildings(building_type);
```

## Step 3: Row Level Security (RLS) Configuration

For this Telegram bot, **disable RLS** on the tables since the bot manages user access through Telegram authentication:

```sql
-- Disable RLS on tables (bot handles access control via Telegram)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_buildings DISABLE ROW LEVEL SECURITY;
```

**Note**: If you want to enable RLS later for additional security (e.g., for a web frontend), you'll need:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_buildings ENABLE ROW LEVEL SECURITY;

-- Service role policies (for bot with service_role_key)
CREATE POLICY "Service can manage all" ON users
  AS PERMISSIVE FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service can manage all" ON user_buildings
  AS PERMISSIVE FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
```

However, for now, **disabling RLS is recommended** for a bot-driven application.

## Step 4: Environment Variables

Make sure your `.env` file has:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com
MINIAPP_URL=https://your-miniapp-url.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
PORT=3000
```

## Initial Data

When a new user starts the game:
- **Gold**: 5,000
- **Wood**: 2,500
- **Stone**: 2,500
- **Meat**: 500
- **Jabcoins**: 0

Buildings are automatically created:
- **3 Mines** (⛏ - produces Gold)
- **3 Quarries** (🪨 - produces Stone)
- **3 Lumber Mills** (🌲 - produces Wood)
- **3 Farms** (🍖 - produces Meat)

Each building starts at Level 1 with a base production rate.

## Testing

1. Start the bot and use `/start` command
2. Click the MiniApp button
3. Navigate to the Mining (⛏) section
4. Switch between building types using the tabs
5. Click "Собрать" (Collect) to gather resources
6. Click "Улучшить" (Upgrade) to improve buildings

## Troubleshooting

**Tables don't exist error**: Run the SQL creation scripts above in Supabase SQL Editor

**Buildings not showing**: Make sure the user_buildings table was created and the initial buildings are being inserted when user starts

**Styling issues**: Clear browser cache (Ctrl+Shift+Delete) and reload

**API endpoints not working**: Check that your Express server is running and the Telegram webhook is properly configured
