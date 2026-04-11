# 🗄️ Database Setup Guide

## Automatic Setup

The application will **automatically check** for required database tables every time it starts. If the tables don't exist, it will show you exactly what SQL to run.

## Manual Setup (If Needed)

If you need to manually create the tables, follow these steps:

### 1. Go to Supabase Dashboard
Visit: https://app.supabase.com

### 2. Select Your Project

### 3. Open SQL Editor
- Click on **"SQL Editor"** in the left sidebar
- Click **"New Query"**

### 4. Copy and Paste This SQL

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  gold BIGINT DEFAULT 5000,
  wood BIGINT DEFAULT 2500,
  stone BIGINT DEFAULT 2500,
  meat BIGINT DEFAULT 500,
  jabcoins BIGINT DEFAULT 0,
  referral_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_buildings table
CREATE TABLE IF NOT EXISTS public.user_buildings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  building_type TEXT NOT NULL,
  building_number INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  collected_amount BIGINT DEFAULT 0,
  production_rate BIGINT NOT NULL,
  last_collected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, building_type, building_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_buildings_user_id ON public.user_buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_buildings_type ON public.user_buildings(building_type);
```

### 5. Run the Query
- Click **"Run"** or press **CMD+Enter** (Mac) / **CTRL+Enter** (Windows)
- You should see: `✓ Success. No rows returned`

### 6. Restart Your Application
- Stop the current running instance (CTRL+C)
- Start it again: `npm run dev` or `npm start`

## What These Tables Do

### `users` Table
Stores player information:
- `telegram_id` - Unique Telegram user ID
- `gold`, `wood`, `stone`, `meat` - Resource amounts
- `jabcoins` - Premium currency
- `referral_count` - Number of friends invited

### `user_buildings` Table
Stores buildings for each player:
- `user_id` - Which player owns the building
- `building_type` - Type: mine, quarry, lumber_mill, farm
- `level` - Current upgrade level
- `collected_amount` - Resources ready to collect
- `production_rate` - Resources produced per hour

## Verification

After setup, the application should display:
```
✅ All required database tables verified and ready!
```

If you see this message, everything is set up correctly!

## Troubleshooting

### Error: "Users table not found"
- Make sure you ran the SQL queries above
- Check that you're in the correct Supabase project
- Verify the table names are exactly: `users` and `user_buildings`

### Error: "PGRST116"
- This means the table doesn't exist
- Run the SQL setup above
- Restart the application

### Still having issues?
- Check that your `SUPABASE_URL` and `SUPABASE_KEY` in `.env` are correct
- Verify you're using the right Supabase project
- Try creating the tables manually in the SQL Editor
