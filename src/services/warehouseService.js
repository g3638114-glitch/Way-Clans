import { supabase } from '../bot.js';
import {
  getWarehouseCapacity,
  getWarehouseUpgradeCost,
  getMaxWarehouseLevel,
} from '../config/buildings.js';

/**
 * Get warehouse info for a user
 * Warehouse stores wood (дерево), stone (камень), and meat (мясо)
 * Each resource type has the same capacity limit
 */
export async function getUserWarehouse(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (error) {
    throw new Error('User not found');
  }

  const warehouseLevel = user.warehouse_level || 1;
  const capacity = getWarehouseCapacity(warehouseLevel);
  const maxLevel = getMaxWarehouseLevel();

  return {
    userId: user.id,
    currentLevel: warehouseLevel,
    maxLevel: maxLevel,
    wood: user.wood || 0,
    stone: user.stone || 0,
    meat: user.meat || 0,
    capacity: capacity,
    isFull: (user.wood || 0) >= capacity || (user.stone || 0) >= capacity || (user.meat || 0) >= capacity,
    woodProgress: capacity > 0 ? ((user.wood || 0) / capacity) * 100 : 0,
    stoneProgress: capacity > 0 ? ((user.stone || 0) / capacity) * 100 : 0,
    meatProgress: capacity > 0 ? ((user.meat || 0) / capacity) * 100 : 0,
  };
}

/**
 * Upgrade warehouse to the next level
 * Requires jamcoins (gold), stone, and wood
 */
export async function upgradeWarehouse(userId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (userError) {
    throw new Error('User not found');
  }

  const currentLevel = user.warehouse_level || 1;
  const maxLevel = getMaxWarehouseLevel();

  // Can't upgrade beyond max level
  if (currentLevel >= maxLevel) {
    throw new Error(`Warehouse is already at maximum level (${maxLevel})`);
  }

  const nextLevel = currentLevel + 1;

  // Get upgrade cost
  const costData = getWarehouseUpgradeCost(nextLevel);
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
      warehouse_level: nextLevel,
    })
    .eq('id', user.id);

  if (updateError) {
    throw new Error('Failed to upgrade warehouse');
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

  const newCapacity = getWarehouseCapacity(nextLevel);

  return {
    success: true,
    cost: costData,
    newLevel: nextLevel,
    newCapacity: newCapacity,
    user: updatedUser,
  };
}

/**
 * Check if warehouse is full for any of the three resource types
 * (used when collecting resources)
 * Warehouse stores wood, stone, and meat
 */
export async function isWarehouseFull(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (error) {
    throw new Error('User not found');
  }

  const warehouseLevel = user.warehouse_level || 1;
  const capacity = getWarehouseCapacity(warehouseLevel);

  return (
    (user.wood || 0) >= capacity ||
    (user.stone || 0) >= capacity ||
    (user.meat || 0) >= capacity
  );
}

/**
 * Check if a specific resource type is at warehouse capacity
 * @param {number} userId - Telegram user ID
 * @param {string} resourceType - Resource type ('wood', 'stone', or 'meat')
 * @returns {boolean} True if resource is at capacity
 */
export async function isResourceAtCapacity(userId, resourceType) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (error) {
    throw new Error('User not found');
  }

  const warehouseLevel = user.warehouse_level || 1;
  const capacity = getWarehouseCapacity(warehouseLevel);
  const resourceAmount = user[resourceType] || 0;

  return resourceAmount >= capacity;
}
