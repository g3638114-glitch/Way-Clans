import { supabase } from '../bot.js';
import { getProductionRate, getCapacity, getUpgradeCost, getResourceType, getTreasuryCapacity, getWarehouseCapacity } from '../config/buildings.js';

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
 */
async function getOrCreateUser(telegramId, userInfo = null) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  // User exists - return it
  if (!error) {
    return user;
  }

  // User doesn't exist - create new
  if (error.code === 'PGRST116') {
    console.log(`📝 Creating new user ${telegramId}`);

    // Use provided Telegram user info or defaults
    const username = userInfo?.username || `user_${telegramId}`;
    const firstName = userInfo?.first_name || 'Player';

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        username: username,
        first_name: firstName,
        photo_url: null,
        gold: 5000,
        wood: 2500,
        stone: 2500,
        meat: 500,
        jabcoins: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating user:', insertError);
      throw new Error('Failed to create user');
    }

    console.log(`✅ User ${telegramId} created successfully (${firstName}/${username})`);

    // Create initial buildings for the user
    await createInitialBuildings(newUser);

    return newUser;
  }

  // Some other error occurred
  throw new Error('User not found');
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
 * Can only collect if building is at full capacity
 */
export async function collectResourcesFromBuilding(userId, buildingId) {
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

  // If building hasn't been activated, can't collect
  if (!building.last_activated) {
    throw new Error('Building must be activated first');
  }

  // Calculate accumulated resources since last activation
  const level = building.level || 1;
  const productionRate = getProductionRate(building.building_type, level);
  const capacity = getCapacity(building.building_type, level);

  const lastActivated = new Date(building.last_activated);
  const now = new Date();
  const hoursPassed = (now - lastActivated) / (1000 * 60 * 60);

  // Calculate total accumulated (with decimals for smooth progress)
  const totalAccumulated = (building.collected_amount || 0) + (hoursPassed * productionRate);
  const accumulated = Math.floor(Math.min(totalAccumulated, capacity));

  // Can collect at any time if building is activated, but collect only what accumulated
  // Determine how much to collect
  const collectedAmount = Math.floor(accumulated);

  // Add accumulated resources to user
  const resourceType = getResourceType(building.building_type);

  // Check storage capacity BEFORE updating building
  if (resourceType === 'gold') {
    // Check treasury capacity for gold
    const treasuryLevel = user.treasury_level || 1;
    const treasuryCapacity = getTreasuryCapacity(treasuryLevel);
    const newGoldAmount = (user.gold || 0) + collectedAmount;

    if (newGoldAmount > treasuryCapacity) {
      throw new Error(`Казна переполнена! Получить средства невозможно. ${collectedAmount} Jamcoin. Вместимость: ${treasuryCapacity}, Ваш баланс: ${user.gold || 0}`);
    }
  } else {
    // Check warehouse capacity for wood, stone, meat
    const warehouseLevel = user.warehouse_level || 1;
    const warehouseCapacity = getWarehouseCapacity(warehouseLevel);
    const newResourceAmount = (user[resourceType] || 0) + collectedAmount;

    if (newResourceAmount > warehouseCapacity) {
      const resourceNames = {
        wood: 'дерева',
        stone: 'камня',
        meat: 'мяса',
      };
      const resourceEmojis = {
        wood: '🌲',
        stone: '🪨',
        meat: '🍖',
      };
      throw new Error(`Склад переполнен! Забрать невозможно. ${collectedAmount} ${resourceNames[resourceType]}. Вместимость: ${warehouseCapacity}, Текущий: ${user[resourceType] || 0} ${resourceEmojis[resourceType]}`);
    }
  }

  // Now update building only if all checks passed
  const { data: updatedBuilding, error: updateError } = await supabase
    .from('user_buildings')
    .update({
      collected_amount: 0,
      last_activated: new Date().toISOString(),
    })
    .eq('id', buildingId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to collect resources');
  }

  const updateData = {};
  updateData[resourceType] = (user[resourceType] || 0) + collectedAmount;

  const { data: updatedUser, error: userUpdateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (userUpdateError) {
    throw new Error('Failed to update resources');
  }

  return {
    success: true,
    collectedAmount: collectedAmount,
    resourceType,
    user: updatedUser,
    building: updatedBuilding,
  };
}

/**
 * Upgrade a building to the next level
 * Mine requires stone + wood
 * Others require gold
 */
export async function upgradeBuilding(userId, buildingId) {
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

  const currentLevel = building.level || 1;

  // Can't upgrade beyond level 5
  if (currentLevel >= 5) {
    throw new Error('Building is already at maximum level (5)');
  }

  const nextLevel = currentLevel + 1;
  const buildingType = building.building_type;

  // Get upgrade cost
  const costData = getUpgradeCost(buildingType, nextLevel);
  if (!costData) {
    throw new Error('Invalid level for upgrade');
  }

  // Check resources
  if (buildingType === 'mine') {
    // Mine requires stone + wood
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
        stone: user.stone - costData.stone,
        wood: user.wood - costData.wood,
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Failed to deduct resources');
    }
  } else {
    // Quarry, Lumber Mill, Farm require gold
    if ((user.gold || 0) < costData.gold) {
      throw new Error(`Not enough gold. Need ${costData.gold}, have ${user.gold || 0}`);
    }

    // Deduct gold
    const { error: updateError } = await supabase
      .from('users')
      .update({
        gold: user.gold - costData.gold,
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Failed to deduct gold');
    }
  }

  // Update building level
  const newProductionRate = getProductionRate(buildingType, nextLevel);

  const { data: updatedBuilding, error: upgradeBuildingError } = await supabase
    .from('user_buildings')
    .update({
      level: nextLevel,
      production_rate: newProductionRate,
    })
    .eq('id', buildingId)
    .select()
    .single();

  if (upgradeBuildingError) {
    throw new Error('Failed to upgrade building');
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
    user: updatedUser,
    building: updatedBuilding,
  };
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
