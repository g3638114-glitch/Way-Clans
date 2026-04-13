import { supabase } from '../bot.js';
import { getTreasuryCapacity, getTreasuryUpgradeCost, getMaxTreasuryLevel } from '../config/buildings.js';

/**
 * Get treasury info for a user
 */
export async function getUserTreasury(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (error) {
    throw new Error('User not found');
  }

  const treasuryLevel = user.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);
  const maxLevel = getMaxTreasuryLevel();

  return {
    userId: user.id,
    currentLevel: treasuryLevel,
    maxLevel: maxLevel,
    currentJamcoins: user.jabcoins || 0,
    capacity: capacity,
    isFull: (user.jabcoins || 0) >= capacity,
    progress: capacity > 0 ? ((user.jabcoins || 0) / capacity) * 100 : 0,
  };
}

/**
 * Upgrade treasury to the next level
 * Requires jamcoins, stone, and wood
 */
export async function upgradeTreasury(userId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

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
  if ((user.jabcoins || 0) < costData.jamcoins) {
    throw new Error(
      `Not enough Jamcoins. Need ${costData.jamcoins}, have ${user.jabcoins || 0}`
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
      jabcoins: user.jabcoins - costData.jamcoins,
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
 */
export async function isTreasuryFull(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (error) {
    throw new Error('User not found');
  }

  const treasuryLevel = user.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);

  return (user.jabcoins || 0) >= capacity;
}
