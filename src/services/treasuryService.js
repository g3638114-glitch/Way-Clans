import { supabase } from '../bot.js';
import { getTreasuryCapacity, getTreasuryUpgradeCost, getMaxTreasuryLevel } from '../config/buildings.js';
import { getUserByTelegramId } from './userService.js';

/**
 * Get treasury info for a user
 * Treasury stores Jamcoin 💰 (gold)
 */
export async function getUserTreasury(userId) {
  const user = await getUserByTelegramId(userId);

  const treasuryLevel = user.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);
  const maxLevel = getMaxTreasuryLevel();

  return {
    userId: user.id,
    currentLevel: treasuryLevel,
    maxLevel: maxLevel,
    currentJamcoins: user.gold || 0,
    capacity: capacity,
    isFull: (user.gold || 0) >= capacity,
    progress: capacity > 0 ? ((user.gold || 0) / capacity) * 100 : 0,
  };
}

/**
 * Upgrade treasury to the next level
 * Requires jamcoins (gold), stone, and wood
 */
export async function upgradeTreasury(userId) {
  const user = await getUserByTelegramId(userId);

  const currentLevel = user.treasury_level || 1;
  const maxLevel = getMaxTreasuryLevel();

  // Can't upgrade beyond max level
  if (currentLevel >= maxLevel) {
    throw new Error(`Treasury is already at maximum level (${maxLevel})`);
  }

  const nextLevel = currentLevel + 1;

  // Get upgrade cost
  const costData = getTreasuryUpgradeCost(nextLevel);
  if (!costData) {
    throw new Error('Invalid level for upgrade');
  }

  // Check resources
  if ((user.gold || 0) < costData.jamcoins) {
    throw new Error(
      `Not enough Jamcoin. Need ${costData.jamcoins}, have ${user.gold || 0}`
    );
  }

  if ((user.stone || 0) < costData.stone) {
    throw new Error(`Not enough stone. Need ${costData.stone}, have ${user.stone || 0}`);
  }

  if ((user.wood || 0) < costData.wood) {
    throw new Error(`Not enough wood. Need ${costData.wood}, have ${user.wood || 0}`);
  }

  // Deduct resources
  const { error: updateError } = await supabase
    .from('users')
    .update({
      gold: user.gold - costData.jamcoins,
      stone: user.stone - costData.stone,
      wood: user.wood - costData.wood,
      treasury_level: nextLevel,
    })
    .eq('id', user.id);

  if (updateError) {
    throw new Error('Failed to upgrade treasury');
  }

  // Get updated user data
  const { data: updatedUser, error: getUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (getUserError) {
    throw new Error('Failed to get updated user data');
  }

  const newCapacity = getTreasuryCapacity(nextLevel);

  return {
    success: true,
    cost: costData,
    newLevel: nextLevel,
    newCapacity: newCapacity,
    user: updatedUser,
  };
}

/**
 * Check if treasury is full (used when collecting resources)
 * Treasury stores Jamcoin 💰 (gold)
 */
export async function isTreasuryFull(userId) {
  const user = await getUserByTelegramId(userId);

  const treasuryLevel = user.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);

  return (user.gold || 0) >= capacity;
}
