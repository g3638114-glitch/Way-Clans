import { supabase } from '../bot.js';
import {
  getTreasuryLimit,
  getTreasuryUpgradeCost,
  getMaxTreasuryLevel,
  isMaxTreasuryLevel,
} from '../config/treasury.js';

/**
 * Get user's treasury data with current limit and availability
 */
export async function getUserTreasury(userId) {
  const { data: treasury, error: treasuryError } = await supabase
    .from('user_treasury')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (treasuryError) {
    // Treasury doesn't exist, create it
    if (treasuryError.code === 'PGRST116') {
      const { data: newTreasury, error: createError } = await supabase
        .from('user_treasury')
        .insert({
          user_id: userId,
          level: 1,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create treasury');
      }

      return enrichTreasuryData(newTreasury);
    }
    throw new Error('Failed to fetch treasury');
  }

  return enrichTreasuryData(treasury);
}

/**
 * Enrich treasury data with calculated values
 */
function enrichTreasuryData(treasuryRecord) {
  const level = treasuryRecord.level;
  const limit = getTreasuryLimit(level);
  const upgradeCost = getTreasuryUpgradeCost(level);
  const maxLevel = getMaxTreasuryLevel();
  const isMaxLevel = isMaxTreasuryLevel(level);

  return {
    ...treasuryRecord,
    limit,
    upgradeCost,
    maxLevel,
    isMaxLevel,
    nextLevel: isMaxLevel ? null : level + 1,
  };
}

/**
 * Upgrade treasury to next level
 * Deducts upgrade costs from user resources
 */
export async function upgradeTreasury(userId) {
  // Get current treasury and user
  const { data: treasury, error: treasuryError } = await supabase
    .from('user_treasury')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (treasuryError) {
    throw new Error('Treasury not found');
  }

  // Check if already at max level
  if (isMaxTreasuryLevel(treasury.level)) {
    throw new Error('Treasury is already at maximum level');
  }

  // Get upgrade cost
  const upgradeCost = getTreasuryUpgradeCost(treasury.level);
  if (!upgradeCost) {
    throw new Error('Invalid upgrade level');
  }

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  // Check if user has enough resources
  if (user.jabcoins < upgradeCost.jamcoin) {
    throw new Error('Not enough jamcoins');
  }
  if (user.stone < upgradeCost.stone) {
    throw new Error('Not enough stone');
  }
  if (user.wood < upgradeCost.wood) {
    throw new Error('Not enough wood');
  }

  // Deduct resources and upgrade treasury
  const newLevel = treasury.level + 1;

  const { data: updatedUser, error: userUpdateError } = await supabase
    .from('users')
    .update({
      jabcoins: user.jabcoins - upgradeCost.jamcoin,
      stone: user.stone - upgradeCost.stone,
      wood: user.wood - upgradeCost.wood,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (userUpdateError) {
    throw new Error('Failed to update user resources');
  }

  const { data: updatedTreasury, error: treasuryUpdateError } = await supabase
    .from('user_treasury')
    .update({
      level: newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (treasuryUpdateError) {
    throw new Error('Failed to upgrade treasury');
  }

  return {
    success: true,
    treasury: enrichTreasuryData(updatedTreasury),
    user: updatedUser,
  };
}

/**
 * Check if user's jamcoins are at treasury limit
 * Returns true if jabcoins >= current treasury limit
 */
export async function isTreasuryFull(userId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('jabcoins')
    .eq('id', userId)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  const treasury = await getUserTreasury(userId);
  return user.jabcoins >= treasury.limit;
}

/**
 * Get how many jamcoins the user can still collect
 * Returns remaining capacity or 0 if full
 */
export async function getTreasuryRemainingCapacity(userId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('jabcoins')
    .eq('id', userId)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  const treasury = await getUserTreasury(userId);
  const remaining = Math.max(0, treasury.limit - user.jabcoins);
  return remaining;
}
