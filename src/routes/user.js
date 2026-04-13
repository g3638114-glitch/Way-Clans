import express from 'express';
import crypto from 'crypto';
import { supabase } from '../bot.js';

const router = express.Router();

/**
 * Create initial buildings for a user (mine, quarry, lumber_mill, farm)
 */
async function createInitialBuildings(userRecord) {
  try {
    if (!userRecord || !userRecord.id) {
      console.error('Error: Invalid user record for initial buildings');
      return;
    }

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
 * Get a user by telegram_id, create if doesn't exist
 */
async function getOrCreateUser(telegramId, userInfo = null) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  // User exists - return it
  if (!error) {
    return user;
  }

  // User doesn't exist - create new
  if (error.code === 'PGRST116') {
    console.log(`📝 Creating new user ${telegramId}`);

    // Use provided Telegram user info or defaults
    const username = userInfo?.username || `user_${telegramId}`;
    const firstName = userInfo?.first_name || 'Player';

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        username: username,
        first_name: firstName,
        photo_url: null,
        gold: 5000,
        wood: 2500,
        stone: 2500,
        meat: 500,
        jamcoins: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating user:', insertError);
      throw new Error('Failed to create user');
    }

    console.log(`✅ User ${telegramId} created successfully (${firstName}/${username})`);

    // Create initial buildings for the user
    await createInitialBuildings(newUser);

    return newUser;
  }

  // Some other error occurred
  throw new Error('User not found');
}

/**
 * Get profile photo URL for a Telegram user using direct Telegram Bot API
 * Returns the URL of the user's profile photo if available
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

/**
 * Verify Telegram initData signature to extract userId securely
 * initData is sent by Telegram when Web App is opened through a web_app button
 */
function verifyTelegramInitData(initData, botToken) {
  try {
    if (!initData) {
      return null;
    }

    // Parse the init data
    const data = new URLSearchParams(initData);
    const hash = data.get('hash');

    if (!hash) {
      console.warn('No hash in initData');
      return null;
    }

    // Remove hash from data
    data.delete('hash');

    // Create the data check string
    const dataCheckString = Array.from(data.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Compute HMAC-SHA256
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Verify hash
    if (computedHash !== hash) {
      console.warn('Invalid initData signature');
      return null;
    }

    // Extract user data
    const userStr = data.get('user');
    if (!userStr) {
      console.warn('No user data in initData');
      return null;
    }

    const user = JSON.parse(userStr);
    console.log(`✅ Verified initData for user ${user.id}`);
    return user.id;
  } catch (error) {
    console.error('Error verifying initData:', error.message);
    return null;
  }
}

// POST /api/user/auth/verify - Verify Telegram initData and get userId
router.post('/auth/verify', async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const userId = verifyTelegramInitData(initData, botToken);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid initData' });
    }

    console.log(`📝 Verified user ID from initData: ${userId}`);
    res.json({ userId });
  } catch (error) {
    console.error('Error in auth/verify:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET/POST /api/user/:userId
// Supports both GET (legacy) and POST (with userInfo from MiniApp)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await getOrCreateUser(userId);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userInfo } = req.body;

    const user = await getOrCreateUser(userId, userInfo);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/user/:userId/fetch-photo - Fetch and save user's Telegram profile photo
router.post('/:userId/fetch-photo', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the user first
    const user = await getOrCreateUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch the profile photo
    const photoUrl = await getUserProfilePhotoUrl(userId);

    if (photoUrl) {
      // Update the user's photo in the database
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ photo_url: photoUrl })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user photo:', updateError);
        return res.status(500).json({ error: 'Failed to update photo' });
      }

      res.json({ success: true, photoUrl, user: updatedUser });
    } else {
      res.json({ success: true, photoUrl: null, user });
    }
  } catch (error) {
    console.error('Error in fetch-photo endpoint:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
