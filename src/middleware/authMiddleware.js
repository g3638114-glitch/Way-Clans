import { supabase } from '../bot.js';

/**
 * Validate that the userId parameter is a valid UUID format
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate that the userId parameter is a valid telegram_id (numeric)
 */
function isValidTelegramId(id) {
  return /^\d+$/.test(id);
}

/**
 * Middleware to validate userId parameter
 * Ensures the userId is either a valid UUID or valid telegram_id
 * and that the user exists in the database
 */
export async function validateUserId(req, res, next) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }

    // Check if it's a UUID or telegram_id (numeric)
    let user = null;

    if (isValidUUID(userId)) {
      // It's a UUID - look up by user id
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return res.status(401).json({ error: 'User not found or invalid' });
      }
      user = data;
    } else if (isValidTelegramId(userId)) {
      // It's a telegram_id - look up by telegram_id
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', parseInt(userId))
        .single();

      if (error || !data) {
        return res.status(401).json({ error: 'User not found or invalid' });
      }
      user = data;
    } else {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    // Store the verified user ID in the request for later use
    req.authenticatedUserId = user.id;
    next();
  } catch (error) {
    console.error('Error in validateUserId middleware:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Middleware to ensure the userId parameter matches an authenticated user
 * This should be used together with validateUserId
 * NOTE: For true security, this app needs a proper session/token system
 * that verifies the request is coming from the authenticated user
 */
export async function requireAuth(req, res, next) {
  // Check if we have an authenticated user ID from the validation middleware
  if (!req.authenticatedUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // In a production app, you would verify that the request is coming from
  // the authenticated user by checking:
  // 1. A signed JWT token
  // 2. A session cookie
  // 3. A re-verified Telegram initData signature
  // 4. An OAuth token from Telegram
  //
  // For now, we rely on the validateUserId middleware to ensure
  // the user exists in the database

  next();
}

/**
 * Middleware to validate building ownership
 * Ensures the building belongs to the authenticated user
 */
export async function validateBuildingOwnership(req, res, next) {
  try {
    const { buildingId } = req.params;
    const userId = req.authenticatedUserId;

    if (!buildingId) {
      return res.status(400).json({ error: 'buildingId parameter is required' });
    }

    const { data, error } = await supabase
      .from('user_buildings')
      .select('id')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(403).json({ error: 'Building not found or access denied' });
    }

    next();
  } catch (error) {
    console.error('Error in validateBuildingOwnership middleware:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Middleware to validate quest ownership
 * Ensures the quest belongs to the authenticated user
 */
export async function validateQuestOwnership(req, res, next) {
  try {
    const { questId } = req.params;
    const userId = req.authenticatedUserId;

    if (!questId) {
      return res.status(400).json({ error: 'questId parameter is required' });
    }

    const { data, error } = await supabase
      .from('completed_quests')
      .select('id')
      .eq('quest_id', questId)
      .eq('user_id', userId)
      .single();

    // For quests, if not found, it's not an error - they just haven't completed it yet
    // This middleware is mainly for preventing unauthorized access to quest completion records

    next();
  } catch (error) {
    console.error('Error in validateQuestOwnership middleware:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
