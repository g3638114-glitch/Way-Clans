import { supabase } from '../bot.js';
import { getProductionRate, getCapacity, getUpgradeCost, getResourceType, getTreasuryCapacity, getTreasuryCost, getTreasuryMaxLevel, getStorageCapacity, getStorageCost, getStorageMaxLevel } from '../config/buildings.js';
import { transactionCollectResources, transactionUpgradeBuilding, transactionGetOrCreateUser } from './transactionService.js';

// Resource storage limits per level
const RESOURCE_STORAGE_LIMITS = {
  wood: (level) => getStorageCapacity(level),
  stone: (level) => getStorageCapacity(level),
  meat: (level) => getStorageCapacity(level),
};

/**
 * Create initial buildings for a user (mine, quarry, lumber_mill, farm)
 * Each player starts with 1 of each building type at level 1
 */
async function createInitialBuildings(userRecord) {
  try {
    if (!userRecord || !userRecord.id) {
      console.error('Error: Invalid user record for initial buildings');
      return;
    }

    const buildingTypes = ['mine', 'quarry', 'lumber_mill', 'farm'];
    const productionRates = {
      mine: 100,
      quarry: 80,
      lumber_mill: 90,
      farm: 70,
    };

    const buildingsToCreate = buildingTypes.map((type) => ({
      user_id: userRecord.id,
      building_type: type,
      building_number: 1,
      level: 1,
      collected_amount: 0,
      production_rate: productionRates[type],
      last_activated: null,
      created_at: new Date().toISOString(),
    }));

    const { data: createdBuildings, error: createError } = await supabase
      .from('user_buildings')
      .insert(buildingsToCreate)
      .select();

    if (createError) {
      console.error('Error creating initial buildings:', createError);
      return;
    }

    console.log(`✅ Created ${createdBuildings.length} initial buildings for user ${userRecord.id}`);
  } catch (error) {
    console.error('Error creating initial buildings:', error);
  }
}

/**
 * Get a user by telegram_id, create if doesn't exist
 * Uses database transactions to prevent race conditions
 */
async function getOrCreateUser(telegramId, userInfo = null) {
  try {
    // Use transactional version that handles concurrent creation
    const user = await transactionGetOrCreateUser(telegramId, userInfo);

    if (!user) {
      throw new Error('Failed to get or create user');
    }

    console.log(`✅ User ${telegramId} ready (${user.first_name}/${user.username})`);
    return user;
  } catch (error) {
    console.error('❌ Error in getOrCreateUser:', error.message);
    throw new Error('Failed to get or create user');
  }
}

/**
 * Get a user by telegram_id
 */
async function getUserByTelegramId(telegramId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Activate a building to start production
 * Resources will accumulate from this point until capacity is reached
 */
export async function activateBuilding(userId, buildingId) {
  const user = await getOrCreateUser(userId);

  const { data: building, error: buildError } = await supabase
    .from('user_buildings')
    .select('*')
    .eq('id', buildingId)
    .eq('user_id', user.id)
    .single();

  if (buildError) {
    throw new Error('Building not found');
  }

  // Set activation time to now
  const { data: updatedBuilding, error: updateError } = await supabase
    .from('user_buildings')
    .update({
      last_activated: new Date().toISOString(),
      collected_amount: 0,
    })
    .eq('id', buildingId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to activate building');
  }

  return { success: true, building: updatedBuilding };
}

/**
 * Collect resources from a building
 * Uses database transactions to prevent race conditions
 * ATOMICALLY: checks building state, calculates resources, updates both building and user
 */
export async function collectResourcesFromBuilding(userId, buildingId) {
  try {
    // Use transactional version that prevents double-collection
    const result = await transactionCollectResources(userId, buildingId);
    return result;
  } catch (error) {
    console.error('Error collecting resources:', error.message);
    throw error;
  }
}

/**
 * Upgrade a building to the next level
 * Uses database transactions to prevent race conditions
 * ATOMICALLY: checks resources, deducts them, and upgrades building level
 * Ensures consistent state even if one operation fails
 */
export async function upgradeBuilding(userId, buildingId) {
  try {
    // Use transactional version that prevents double-upgrade and resource deduction issues
    const result = await transactionUpgradeBuilding(userId, buildingId);
    return result;
  } catch (error) {
    console.error('Error upgrading building:', error.message);
    throw error;
  }
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

/**
 * Upgrade Treasury (Казна) - increases Jamcoin storage capacity
 */
export async function upgradeTreasury(userId) {
  const user = await getOrCreateUser(userId);

  const currentLevel = user.treasury_level || 1;
  const maxLevel = getTreasuryMaxLevel();

  // Can't upgrade beyond maximum level
  if (currentLevel >= maxLevel) {
    throw new Error(`Treasury is already at maximum level (${maxLevel})`);
  }

  const nextLevel = currentLevel + 1;

  // Get upgrade cost
  const costData = getTreasuryCost(nextLevel);
  if (!costData) {
    throw new Error('Invalid level for upgrade');
  }

  // Check resources
  if ((user.gold || 0) < costData.gold) {
    throw new Error(`Not enough gold. Need ${costData.gold}, have ${user.gold || 0}`);
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
      gold: user.gold - costData.gold,
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

  return {
    success: true,
    cost: costData,
    newLevel: nextLevel,
    newCapacity: getTreasuryCapacity(nextLevel),
    user: updatedUser,
  };
}

/**
 * Upgrade Storage (Склад) - increases resource storage capacity
 */
export async function upgradeStorage(userId) {
  const user = await getOrCreateUser(userId);

  const currentLevel = user.storage_level || 1;
  const maxLevel = getStorageMaxLevel();

  // Can't upgrade beyond maximum level
  if (currentLevel >= maxLevel) {
    throw new Error(`Storage is already at maximum level (${maxLevel})`);
  }

  const nextLevel = currentLevel + 1;

  // Get upgrade cost
  const costData = getStorageCost(nextLevel);
  if (!costData) {
    throw new Error('Invalid level for upgrade');
  }

  // Check resources
  if ((user.gold || 0) < costData.gold) {
    throw new Error(`Not enough gold. Need ${costData.gold}, have ${user.gold || 0}`);
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
      gold: user.gold - costData.gold,
      stone: user.stone - costData.stone,
      wood: user.wood - costData.wood,
      storage_level: nextLevel,
    })
    .eq('id', user.id);

  if (updateError) {
    throw new Error('Failed to upgrade storage');
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

  return {
    success: true,
    cost: costData,
    newLevel: nextLevel,
    newCapacity: getStorageCapacity(nextLevel),
    user: updatedUser,
  };
}
