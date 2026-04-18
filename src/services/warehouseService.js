import { supabase } from '../bot.js';
import { getWarehouseCapacity, getWarehouseUpgradeCost, getMaxWarehouseLevel } from '../config/buildings.js';
import { getUserByTelegramId } from './userService.js';
import { withTransaction } from '../database/pg.js';

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
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const currentLevel = user.warehouse_level || 1;
    const maxLevel = getMaxWarehouseLevel();
    if (currentLevel >= maxLevel) {
      throw new Error(`Warehouse is already at maximum level (${maxLevel})`);
    }

    const nextLevel = currentLevel + 1;
    const costData = getWarehouseUpgradeCost(nextLevel);
    if (!costData) throw new Error('Invalid level for upgrade');

    const nextGold = Number(user.gold) - costData.jamcoins;
    const nextStone = Number(user.stone) - costData.stone;
    const nextWood = Number(user.wood) - costData.wood;

    if (nextGold < 0) throw new Error(`Not enough Jamcoin. Need ${costData.jamcoins}, have ${user.gold || 0}`);
    if (nextStone < 0) throw new Error(`Not enough stone. Need ${costData.stone}, have ${user.stone || 0}`);
    if (nextWood < 0) throw new Error(`Not enough wood. Need ${costData.wood}, have ${user.wood || 0}`);

    const updatedUserResult = await client.query(
      `UPDATE users
       SET gold = $1, stone = $2, wood = $3, warehouse_level = $4
       WHERE id = $5
       RETURNING *`,
      [nextGold, nextStone, nextWood, nextLevel, user.id]
    );

    return {
      success: true,
      cost: costData,
      newLevel: nextLevel,
      newCapacity: getWarehouseCapacity(nextLevel),
      user: updatedUserResult.rows[0],
    };
  });
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
