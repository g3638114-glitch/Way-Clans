import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init.js';

dotenv.config();

// Initialize bot and Supabase
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Create initial buildings for a new user (free buildings: mine, quarry, lumber_mill, farm)
 * Each player starts with 1 of each building type at level 1
 */
async function createInitialBuildings(userRecord) {
  try {
    // userRecord is already the user object from Supabase, no need to query again
    if (!userRecord || !userRecord.id) {
      console.error('Error: Invalid user record for initial buildings');
      return;
    }

    // Create initial buildings: mine, quarry, lumber_mill, farm
    const buildingTypes = ['mine', 'quarry', 'lumber_mill', 'farm'];
    const productionRates = {
      mine: 100,
      quarry: 80,
      lumber_mill: 90,
      farm: 70,
    };

    const buildingsToCreate = buildingTypes.map((type) => ({
      user_id: userRecord.id,
      building_type: type,
      building_number: 1,
      level: 1,
      collected_amount: 0,
      production_rate: productionRates[type],
      last_activated: null,
      created_at: new Date().toISOString(),
    }));

    const { data: createdBuildings, error: createError } = await supabase
      .from('user_buildings')
      .insert(buildingsToCreate)
      .select();

    if (createError) {
      console.error('Error creating initial buildings:', createError);
      return;
    }

    console.log(`✅ Created ${createdBuildings.length} initial buildings for user ${userRecord.id}`);
  } catch (error) {
    console.error('Error creating initial buildings:', error);
  }
}

/**
 * Get profile photo URL for a Telegram user using direct Telegram Bot API
 * Returns the URL of the user's profile photo if available
 * Includes retry logic for reliability
 */
async function getUserProfilePhotoUrl(userId, maxRetries = 2) {
  let lastError;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set');
    return null;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Call Telegram Bot API directly to get user profile photos
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getUserProfilePhotos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            offset: 0,
            limit: 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.ok) {
        throw new Error(`Telegram API returned error: ${result.description}`);
      }

      const photos = result.result;

      if (photos && photos.photos && photos.photos.length > 0) {
        // Get the largest photo (usually the last one in the array)
        const photoArray = photos.photos[0];
        if (photoArray && photoArray.length > 0) {
          const largestPhoto = photoArray[photoArray.length - 1];

          // Get file info to construct the download URL
          const fileResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_id: largestPhoto.file_id }),
            }
          );

          if (!fileResponse.ok) {
            throw new Error(`Telegram getFile error: ${fileResponse.status}`);
          }

          const fileResult = await fileResponse.json();

          if (fileResult.ok && fileResult.result && fileResult.result.file_path) {
            const photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileResult.result.file_path}`;
            console.log(`✅ Successfully fetched profile photo for user ${userId}`);
            return photoUrl;
          }
        }
      }

      // User has no profile photo
      console.log(`ℹ️ User ${userId} has no profile photo`);
      return null;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt + 1}/${maxRetries + 1} - Error getting user profile photo:`, error.message);

      // Wait before retrying (exponential backoff: 500ms, 1000ms)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }
    }
  }

  console.error(`❌ Failed to get profile photo after ${maxRetries + 1} attempts:`, lastError?.message);
  return null;
}

// Handle /start command
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'Unknown';
  const firstName = ctx.from.first_name || '';

  try {
    // Get user's profile photo URL from Telegram with retry logic
    const photoUrl = await getUserProfilePhotoUrl(userId);

    // Get or create user in Supabase
    let { data: user, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (selectError && selectError.code === 'PGRST116') {
      // User doesn't exist, create new with initial resources
      console.log(`📝 Creating new user ${userId}`);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: userId,
          username: username,
          first_name: firstName,
          photo_url: photoUrl,
          gold: 5000,
          wood: 2500,
          stone: 2500,
          meat: 500,
          jabcoins: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating user:', insertError);
        await ctx.reply('Произошла ошибка при создании аккаунта. Попробуйте позже.');
        return;
      }

      user = newUser;
      console.log(`✅ User ${userId} created successfully`);
      // Create initial buildings for the user
      await createInitialBuildings(user);
    } else if (selectError) {
      console.error('❌ Error fetching user:', selectError);
      await ctx.reply('Произошла ошибка при загрузке вашего аккаунта. Попробуйте позже.');
      return;
    } else {
      // User exists - update profile info and photo
      console.log(`📝 Updating existing user ${userId}`);
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: username,
          first_name: firstName,
          photo_url: photoUrl,
        })
        .eq('telegram_id', userId);

      if (updateError) {
        console.error('⚠️ Error updating user profile:', updateError);
        // Continue anyway - the user can still play
      } else {
        console.log(`✅ User ${userId} profile updated`);
      }
    }

    // Send welcome message with MiniApp button
    const miniappUrl = `${process.env.MINIAPP_URL}?userId=${userId}`;

    await ctx.reply('🎮 Добро пожаловать в Way Clans!', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Открыть МiniApp',
              web_app: { url: miniappUrl },
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error('❌ Error in /start command:', error);
    await ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
});

// Handle unknown commands
bot.on('message', async (ctx) => {
  // Only respond to unknown messages
  if (!ctx.message.text?.startsWith('/')) {
    await ctx.reply('Используйте команду /start для начала игры.');
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  try {
    ctx.reply('Произошла ошибка. Попробуйте позже.').catch(() => {});
  } catch (e) {
    console.error('Error sending error message:', e);
  }
});

export { bot, supabase, initializeDatabase };
