import express from 'express';
import crypto from 'crypto';
import { supabase } from '../bot.js';
import { applyReferralIfEligible, getOrCreateUser, getReferralSummary } from '../services/userService.js';

const router = express.Router();

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
    const startParam = req.query.startParam;

    let user = await getOrCreateUser(userId);
    user = await applyReferralIfEligible(user, startParam);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userInfo, startParam } = req.body;

    let user = await getOrCreateUser(userId, userInfo);
    user = await applyReferralIfEligible(user, startParam);
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

router.get('/:userId/referrals', async (req, res) => {
  try {
    const { userId } = req.params;
    const summary = await getReferralSummary(userId);

    const directMiniAppLink = buildReferralMiniAppLink(userId);

    res.json({
      totalReferrals: summary.totalReferrals,
      invitedUsers: summary.invitedUsers,
      referralLink: directMiniAppLink,
    });
  } catch (error) {
    console.error('Error loading referrals:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

function buildReferralMiniAppLink(userId) {
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '').trim();
  const miniAppShortName = (process.env.TELEGRAM_MINIAPP_SHORT_NAME || '').trim();

  if (!botUsername || !miniAppShortName) {
    throw new Error('Telegram MiniApp deep link is not configured');
  }

  return `https://t.me/${botUsername}/${miniAppShortName}?startapp=${encodeURIComponent(`ref_${userId}`)}`;
}

export default router;
