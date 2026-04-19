import { supabase } from '../bot.js';
import { getProductionRate, getCapacity, getUpgradeCost, getResourceType, getTreasuryCapacity, getWarehouseCapacity, getMaxBuildingLevel } from '../config/buildings.js';
import { getOrCreateUser } from './userService.js';
import { withTransaction } from '../database/pg.js';

/**
 * Activate a building to start production
 * Resources will accumulate from this point until capacity is reached
 */
export async function activateBuilding(userId, buildingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');

    const buildingResult = await client.query(
      `SELECT * FROM user_buildings
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [buildingId, userResult.rows[0].id]
    );

    if (buildingResult.rows.length === 0) {
      throw new Error('Building not found');
    }

    const updatedBuilding = await client.query(
      `UPDATE user_buildings
       SET last_activated = $1, collected_amount = 0
       WHERE id = $2
       RETURNING *`,
      [new Date().toISOString(), buildingId]
    );

    return { success: true, building: updatedBuilding.rows[0] };
  });
}

/**
 * Collect resources from a building
 * Collects as much as fits into treasury/warehouse and leaves the rest in the building
 */
export async function collectResourcesFromBuilding(userId, buildingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const buildingResult = await client.query(
      `SELECT * FROM user_buildings
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [buildingId, user.id]
    );

    if (buildingResult.rows.length === 0) {
      throw new Error('Building not found');
    }

    const building = buildingResult.rows[0];

    if (!building.last_activated) {
      throw new Error('Building must be activated first');
    }

    const level = building.level || 1;
    const productionRate = getProductionRate(building.building_type, level);
    const capacity = getCapacity(building.building_type, level);
    const lastActivated = new Date(building.last_activated);
    const now = new Date();
    const hoursPassed = (now - lastActivated) / (1000 * 60 * 60);
    const totalAccumulated = Number(building.collected_amount || 0) + (hoursPassed * productionRate);
    const accumulatedAmount = Math.floor(Math.min(totalAccumulated, capacity));
    const resourceType = getResourceType(building.building_type);
    let collectedAmount = accumulatedAmount;
    let availableSpace = 0;

    if (resourceType === 'gold') {
      const treasuryCapacity = getTreasuryCapacity(user.treasury_level || 1);
      availableSpace = Math.max(0, treasuryCapacity - Number(user.gold || 0));
      if (availableSpace <= 0) {
        throw new Error(`Лимит казны достигнут. Вы не можете собрать Jamcoin. Вместимость казны: ${treasuryCapacity}, сейчас: ${user.gold || 0}. Освободите место и попробуйте снова.`);
      }
      collectedAmount = Math.min(accumulatedAmount, availableSpace);
    } else {
      const warehouseCapacity = getWarehouseCapacity(user.warehouse_level || 1);
      availableSpace = Math.max(0, warehouseCapacity - Number(user[resourceType] || 0));
      if (availableSpace <= 0) {
        const resourceNames = { wood: 'дерево', stone: 'камень', meat: 'мясо' };
        throw new Error(`Лимит склада достигнут. Вы не можете собрать ${resourceNames[resourceType]}. Вместимость склада: ${warehouseCapacity}, сейчас: ${user[resourceType] || 0}. Освободите место и попробуйте снова.`);
      }
      collectedAmount = Math.min(accumulatedAmount, availableSpace);
    }

    const remainingAmount = Math.max(0, accumulatedAmount - collectedAmount);

    const updatedBuildingResult = await client.query(
      `UPDATE user_buildings
       SET collected_amount = $1, last_activated = $2
       WHERE id = $3
       RETURNING *`,
      [remainingAmount, new Date().toISOString(), buildingId]
    );

    const updatedUserResult = await client.query(
      `UPDATE users
       SET ${resourceType} = $1
       WHERE id = $2
       RETURNING *`,
       [Number(user[resourceType] || 0) + collectedAmount, user.id]
    );

    return {
      success: true,
      collectedAmount,
      accumulatedAmount,
      remainingAmount,
      partialCollection: remainingAmount > 0,
      resourceType,
      user: updatedUserResult.rows[0],
      building: updatedBuildingResult.rows[0],
    };
  });
}

/**
 * Upgrade a building to the next level
 * Mine requires stone + wood
 * Others require gold
 */
export async function upgradeBuilding(userId, buildingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const buildingResult = await client.query(
      `SELECT * FROM user_buildings
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [buildingId, user.id]
    );

    if (buildingResult.rows.length === 0) {
      throw new Error('Building not found');
    }

    const building = buildingResult.rows[0];
    const currentLevel = building.level || 1;

    const maxLevel = getMaxBuildingLevel();
    if (currentLevel >= maxLevel) {
      throw new Error(`Building is already at maximum level (${maxLevel})`);
    }

    const nextLevel = currentLevel + 1;
    const buildingType = building.building_type;
    const costData = getUpgradeCost(buildingType, nextLevel);

    if (!costData) {
      throw new Error('Invalid level for upgrade');
    }

    let nextGold = Number(user.gold || 0);
    let nextStone = Number(user.stone || 0);
    let nextWood = Number(user.wood || 0);

    if (buildingType === 'mine') {
      if (nextStone < costData.stone) throw new Error(`Not enough stone. Need ${costData.stone}, have ${nextStone}`);
      if (nextWood < costData.wood) throw new Error(`Not enough wood. Need ${costData.wood}, have ${nextWood}`);
      nextStone -= costData.stone;
      nextWood -= costData.wood;
    } else {
      if (nextGold < costData.gold) throw new Error(`Not enough gold. Need ${costData.gold}, have ${nextGold}`);
      nextGold -= costData.gold;
    }

    await client.query(
      'UPDATE users SET gold = $1, stone = $2, wood = $3 WHERE id = $4',
      [nextGold, nextStone, nextWood, user.id]
    );

    const updatedBuildingResult = await client.query(
      `UPDATE user_buildings
       SET level = $1, production_rate = $2
       WHERE id = $3
       RETURNING *`,
      [nextLevel, getProductionRate(buildingType, nextLevel), buildingId]
    );

    const updatedUserResult = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);

    return {
      success: true,
      cost: costData,
      user: updatedUserResult.rows[0],
      building: updatedBuildingResult.rows[0],
    };
  });
}

/**
 * Get all buildings for a user with current progress
 */
export async function getUserBuildings(userId) {
  const user = await getOrCreateUser(userId);

  const { data: buildings, error } = await supabase
    .from('user_buildings')
    .select('*')
    .eq('user_id', user.id)
    .order('building_type', { ascending: true })
    .order('building_number', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch buildings');
  }

  // Calculate current production progress for each building
  const now = new Date();
  const buildingsWithProgress = buildings.map(building => {
    const level = building.level || 1;
    const productionRate = getProductionRate(building.building_type, level);
    const capacity = getCapacity(building.building_type, level);

    let currentAccumulated = building.collected_amount || 0;

    if (building.last_activated) {
      const lastActivated = new Date(building.last_activated);
      const hoursPassed = (now - lastActivated) / (1000 * 60 * 60);
      currentAccumulated = Math.min(
        currentAccumulated + hoursPassed * productionRate,
        capacity
      );
    }

    return {
      ...building,
      currentAccumulated: currentAccumulated,
      capacity: capacity,
      productionRate: productionRate,
      level: level,
      isAtCapacity: currentAccumulated >= capacity,
      isFull: currentAccumulated >= capacity,
      progress: capacity > 0 ? (currentAccumulated / capacity) * 100 : 0,
    };
  });

  return buildingsWithProgress;
}
