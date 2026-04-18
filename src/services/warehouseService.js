import { supabase } from '../bot.js';
import { getWarehouseCapacity, getWarehouseUpgradeCost, getMaxWarehouseLevel } from '../config/buildings.js';
import { getUserByTelegramId } from './userService.js';

/**
 * Get warehouse info for a user
 * Warehouse stores wood, stone, and meat
 */
export async function getUserWarehouse(userId) {
  const user = await getUserByTelegramId(userId);

  const warehouseLevel = user.warehouse_level || 1;
  const capacity = getWarehouseCapacity(warehouseLevel);
  const maxLevel = getMaxWarehouseLevel();

  return {
    userId: user.id,
    currentLevel: warehouseLevel,
    maxLevel: maxLevel,
    currentWood: user.wood || 0,
    currentStone: user.stone || 0,
    currentMeat: user.meat || 0,
    capacity: capacity,
    isWoodFull: (user.wood || 0) >= capacity,
    isStoneFull: (user.stone || 0) >= capacity,
    isMeatFull: (user.meat || 0) >= capacity,
    isFull: (user.wood || 0) >= capacity && (user.stone || 0) >= capacity && (user.meat || 0) >= capacity,
    progress: {
      wood: capacity > 0 ? ((user.wood || 0) / capacity) * 100 : 0,
      stone: capacity > 0 ? ((user.stone || 0) / capacity) * 100 : 0,
      meat: capacity > 0 ? ((user.meat || 0) / capacity) * 100 : 0,
    },
  };
}

/**
 * Upgrade warehouse to the next level
 * Requires jamcoins (gold), stone, and wood
 */
export async function upgradeWarehouse(userId) {
  const user = await getUserByTelegramId(userId);

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
 * Check if warehouse is full for a specific resource
 * Warehouse stores wood, stone, and meat
 */
export async function isWarehouseFull(userId, resource = null) {
  const user = await getUserByTelegramId(userId);

  const warehouseLevel = user.warehouse_level || 1;
  const capacity = getWarehouseCapacity(warehouseLevel);

  if (resource === 'wood') {
    return (user.wood || 0) >= capacity;
  } else if (resource === 'stone') {
    return (user.stone || 0) >= capacity;
  } else if (resource === 'meat') {
    return (user.meat || 0) >= capacity;
  }

  // Check if all are full
  return (
    (user.wood || 0) >= capacity &&
    (user.stone || 0) >= capacity &&
    (user.meat || 0) >= capacity
  );
}

/**
 * Get which resources are full in the warehouse
 */
export async function getFullWarehouseResources(userId) {
  const user = await getUserByTelegramId(userId);

  const warehouseLevel = user.warehouse_level || 1;
  const capacity = getWarehouseCapacity(warehouseLevel);

  const fullResources = [];
  if ((user.wood || 0) >= capacity) fullResources.push('wood');
  if ((user.stone || 0) >= capacity) fullResources.push('stone');
  if ((user.meat || 0) >= capacity) fullResources.push('meat');

  return fullResources;
}
