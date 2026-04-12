import express from 'express';
import crypto from 'crypto';
import { supabase } from '../bot.js';

const router = express.Router();

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

// GET /api/user/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
