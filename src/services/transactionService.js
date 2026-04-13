import pkg from 'pg';
const { Client } = pkg;

/**
 * Transaction service for atomic database operations
 * Handles race conditions by ensuring ACID properties for critical operations
 */

/**
 * Create a database client with connection pooling support
 * Reuses the main database connection for transactions
 */
function getTransactionClient() {
  return new Client({
    connectionString: process.env.DATABASE_URL,
  });
}

/**
 * Execute a transaction for collecting resources from a building
 * ATOMICALLY: reads building state, calculates resources, updates both building and user
 * Prevents double-collection and ensures consistent state
 */
export async function transactionCollectResources(userId, buildingId) {
  const client = await getTransactionClient();
  
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock the user row to prevent concurrent modifications
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    // Lock the building row to prevent concurrent collection
    const buildingResult = await client.query(
      'SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [buildingId, userId]
    );
    
    if (buildingResult.rows.length === 0) {
      throw new Error('Building not found');
    }
    const building = buildingResult.rows[0];

    if (!building.last_activated) {
      throw new Error('Building must be activated first');
    }

    // Calculate accumulated resources (same logic as service)
    const level = building.level || 1;
    
    // Import helpers dynamically to avoid circular dependencies
    const { getProductionRate, getCapacity, getResourceType, getTreasuryCapacity, getStorageCapacity } = await import('../config/buildings.js');
    
    const productionRate = getProductionRate(building.building_type, level);
    const capacity = getCapacity(building.building_type, level);
    
    const lastActivated = new Date(building.last_activated);
    const now = new Date();
    const hoursPassed = (now - lastActivated) / (1000 * 60 * 60);
    
    const totalAccumulated = (building.collected_amount || 0) + (hoursPassed * productionRate);
    const accumulated = Math.floor(Math.min(totalAccumulated, capacity));
    const collectedAmount = Math.floor(accumulated);

    if (collectedAmount <= 0) {
      throw new Error('Nothing to collect');
    }

    // Validate capacity before updating
    const resourceType = getResourceType(building.building_type);
    const currentResourceAmount = user[resourceType] || 0;
    const newResourceAmount = currentResourceAmount + collectedAmount;

    let maxCapacity;
    let containerName;

    if (resourceType === 'gold') {
      const treasuryLevel = user.treasury_level || 1;
      maxCapacity = getTreasuryCapacity(treasuryLevel);
      containerName = 'Treasury';
    } else {
      const storageLevel = user.storage_level || 1;
      maxCapacity = getStorageCapacity(storageLevel);
      containerName = 'Storage';
    }

    if (newResourceAmount > maxCapacity) {
      const canCollect = maxCapacity - currentResourceAmount;
      throw new Error(`${containerName} is full! Can only collect ${canCollect} more ${resourceType}`);
    }

    // Update building - reset collected_amount and last_activated
    const updatedBuildingResult = await client.query(
      `UPDATE user_buildings 
       SET collected_amount = 0, 
           last_activated = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [new Date().toISOString(), buildingId]
    );

    const updatedBuilding = updatedBuildingResult.rows[0];

    // Update user resources
    const updateQuery = `UPDATE users 
                        SET ${resourceType} = $1,
                            updated_at = NOW()
                        WHERE id = $2
                        RETURNING *`;
    
    const userUpdateResult = await client.query(updateQuery, [newResourceAmount, userId]);
    const updatedUser = userUpdateResult.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    return {
      success: true,
      collectedAmount,
      resourceType,
      user: updatedUser,
      building: updatedBuilding,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Execute a transaction for upgrading a building
 * ATOMICALLY: checks resources, deducts them, and upgrades building level
 * Prevents double-upgrade and ensures consistent state
 */
export async function transactionUpgradeBuilding(userId, buildingId) {
  const client = await getTransactionClient();
  
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock the user row
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    // Lock the building row
    const buildingResult = await client.query(
      'SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [buildingId, userId]
    );
    
    if (buildingResult.rows.length === 0) {
      throw new Error('Building not found');
    }
    const building = buildingResult.rows[0];

    const currentLevel = building.level || 1;

    if (currentLevel >= 5) {
      throw new Error('Building is already at maximum level (5)');
    }

    const nextLevel = currentLevel + 1;
    const buildingType = building.building_type;

    // Import helpers
    const { getUpgradeCost, getProductionRate } = await import('../config/buildings.js');
    
    const costData = getUpgradeCost(buildingType, nextLevel);
    if (!costData) {
      throw new Error('Invalid level for upgrade');
    }

    // Check resources (with current locked state)
    if (buildingType === 'mine') {
      if ((user.stone || 0) < costData.stone) {
        throw new Error(`Not enough stone. Need ${costData.stone}, have ${user.stone || 0}`);
      }
      if ((user.wood || 0) < costData.wood) {
        throw new Error(`Not enough wood. Need ${costData.wood}, have ${user.wood || 0}`);
      }

      // Deduct resources in SAME transaction
      const userUpdateResult = await client.query(
        `UPDATE users 
         SET stone = $1, 
             wood = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [user.stone - costData.stone, user.wood - costData.wood, userId]
      );
      
      if (userUpdateResult.rows.length === 0) {
        throw new Error('Failed to deduct resources');
      }
    } else {
      if ((user.gold || 0) < costData.gold) {
        throw new Error(`Not enough gold. Need ${costData.gold}, have ${user.gold || 0}`);
      }

      // Deduct gold in SAME transaction
      const userUpdateResult = await client.query(
        `UPDATE users 
         SET gold = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [user.gold - costData.gold, userId]
      );
      
      if (userUpdateResult.rows.length === 0) {
        throw new Error('Failed to deduct resources');
      }
    }

    // Upgrade building in SAME transaction
    const newProductionRate = getProductionRate(buildingType, nextLevel);

    const upgradeBuildingResult = await client.query(
      `UPDATE user_buildings 
       SET level = $1, 
           production_rate = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [nextLevel, newProductionRate, buildingId]
    );

    if (upgradeBuildingResult.rows.length === 0) {
      throw new Error('Failed to upgrade building');
    }

    const updatedBuilding = upgradeBuildingResult.rows[0];

    // Get final user state
    const finalUserResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    const updatedUser = finalUserResult.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    return {
      success: true,
      cost: costData,
      user: updatedUser,
      building: updatedBuilding,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Execute a transaction for selling resources
 * Ensures atomic update of resource amounts
 */
export async function transactionSellResources(userId, wood = 0, stone = 0, meat = 0) {
  const client = await getTransactionClient();

  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock the user row
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    // Calculate gold from sold resources
    const RESOURCE_PRICES = {
      wood: 10,
      stone: 15,
      meat: 25,
    };

    const goldEarned = (wood || 0) * RESOURCE_PRICES.wood
      + (stone || 0) * RESOURCE_PRICES.stone
      + (meat || 0) * RESOURCE_PRICES.meat;

    // Check if user has enough resources
    if ((wood || 0) > user.wood || (stone || 0) > user.stone || (meat || 0) > user.meat) {
      throw new Error('Not enough resources');
    }

    // Import helper
    const { getTreasuryCapacity } = await import('../config/buildings.js');

    // Check treasury capacity before adding gold
    const treasuryLevel = user.treasury_level || 1;
    const treasuryCapacity = getTreasuryCapacity(treasuryLevel);
    const newGoldAmount = user.gold + goldEarned;

    if (newGoldAmount > treasuryCapacity) {
      const canAdd = treasuryCapacity - user.gold;
      throw new Error(`Treasury is full! Can only add ${canAdd} more gold`);
    }

    // Update user resources in single transaction
    const updateResult = await client.query(
      `UPDATE users
       SET wood = $1,
           stone = $2,
           meat = $3,
           gold = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [user.wood - (wood || 0), user.stone - (stone || 0), user.meat - (meat || 0), newGoldAmount, userId]
    );

    const updatedUser = updateResult.rows[0];
    await client.query('COMMIT');

    return { success: true, user: updatedUser };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Execute a transaction for exchanging gold to jabcoins
 * Ensures atomic update of both currencies
 */
export async function transactionExchangeGold(userId, goldAmount) {
  const client = await getTransactionClient();

  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock the user row
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    const EXCHANGE_RATE = 1000000; // 1000000 gold = 1 jabcoin
    const MIN_EXCHANGE = 1000000;

    if (goldAmount < MIN_EXCHANGE) {
      throw new Error(`Minimum exchange is ${MIN_EXCHANGE} gold`);
    }

    if (user.gold < goldAmount) {
      throw new Error('Not enough gold');
    }

    const jabcoinsGained = Math.floor(goldAmount / EXCHANGE_RATE);

    // Update user in single transaction
    const updateResult = await client.query(
      `UPDATE users
       SET gold = $1,
           jabcoins = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [user.gold - goldAmount, user.jabcoins + jabcoinsGained, userId]
    );

    const updatedUser = updateResult.rows[0];
    await client.query('COMMIT');

    return { success: true, user: updatedUser, jabcoinsGained };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Execute a transaction for adding gold (from coin clicks, etc)
 * Ensures atomic update with treasury capacity check
 */
export async function transactionAddGold(userId, goldAmount) {
  const client = await getTransactionClient();

  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock the user row
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    // Import helper
    const { getTreasuryCapacity } = await import('../config/buildings.js');

    // Check treasury capacity before adding gold
    const treasuryLevel = user.treasury_level || 1;
    const treasuryCapacity = getTreasuryCapacity(treasuryLevel);
    const newGoldAmount = user.gold + goldAmount;

    if (newGoldAmount > treasuryCapacity) {
      const canAdd = treasuryCapacity - user.gold;
      throw new Error(`Treasury is full! Can only add ${canAdd} more gold`);
    }

    // Update user in single transaction
    const updateResult = await client.query(
      `UPDATE users
       SET gold = $1,
           jamcoins_from_clicks = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newGoldAmount, (user.jamcoins_from_clicks || 0) + goldAmount, userId]
    );

    const updatedUser = updateResult.rows[0];
    await client.query('COMMIT');

    return { success: true, user: updatedUser };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Execute a transaction for upgrading treasury
 * ATOMICALLY: checks resources, deducts them, and upgrades treasury level
 * Prevents double-upgrade and ensures consistent state
 */
export async function transactionUpgradeTreasury(userId) {
  const client = await getTransactionClient();

  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock the user row
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    const currentLevel = user.treasury_level || 1;

    // Import helpers
    const { getTreasuryMaxLevel, getTreasuryCapacity, getTreasuryCost } = await import('../config/buildings.js');

    const maxLevel = getTreasuryMaxLevel();

    if (currentLevel >= maxLevel) {
      throw new Error(`Treasury is already at maximum level (${maxLevel})`);
    }

    const nextLevel = currentLevel + 1;
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

    // Deduct resources in SAME transaction
    const userUpdateResult = await client.query(
      `UPDATE users
       SET gold = $1,
           stone = $2,
           wood = $3,
           treasury_level = $4,
           storage_level = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [user.gold - costData.gold, user.stone - costData.stone, user.wood - costData.wood, nextLevel, user.storage_level || 1, userId]
    );

    if (userUpdateResult.rows.length === 0) {
      throw new Error('Failed to upgrade treasury');
    }

    const updatedUser = userUpdateResult.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    return {
      success: true,
      cost: costData,
      newLevel: nextLevel,
      newCapacity: getTreasuryCapacity(nextLevel),
      user: updatedUser,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Execute a transaction for upgrading storage
 * ATOMICALLY: checks resources, deducts them, and upgrades storage level
 * Prevents double-upgrade and ensures consistent state
 */
export async function transactionUpgradeStorage(userId) {
  const client = await getTransactionClient();

  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Lock the user row
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const user = userResult.rows[0];

    const currentLevel = user.storage_level || 1;

    // Import helpers
    const { getStorageMaxLevel, getStorageCapacity, getStorageCost } = await import('../config/buildings.js');

    const maxLevel = getStorageMaxLevel();

    if (currentLevel >= maxLevel) {
      throw new Error(`Storage is already at maximum level (${maxLevel})`);
    }

    const nextLevel = currentLevel + 1;
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

    // Deduct resources in SAME transaction
    const userUpdateResult = await client.query(
      `UPDATE users
       SET gold = $1,
           stone = $2,
           wood = $3,
           storage_level = $4,
           treasury_level = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [user.gold - costData.gold, user.stone - costData.stone, user.wood - costData.wood, nextLevel, user.treasury_level || 1, userId]
    );

    if (userUpdateResult.rows.length === 0) {
      throw new Error('Failed to upgrade storage');
    }

    const updatedUser = userUpdateResult.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    return {
      success: true,
      cost: costData,
      newLevel: nextLevel,
      newCapacity: getStorageCapacity(nextLevel),
      user: updatedUser,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Execute a transaction for user creation with proper uniqueness handling
 * Uses upsert pattern to handle concurrent creation attempts
 * Accepts either a UUID (internal user ID) or a telegram ID (numeric)
 */
export async function transactionGetOrCreateUser(userIdentifier, userInfo = null) {
  const client = await getTransactionClient();

  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // Check if identifier is a UUID or telegram ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdentifier);

    let existingResult;

    if (isUUID) {
      // Query by UUID (internal user ID)
      existingResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userIdentifier]
      );
    } else {
      // Query by telegram ID (numeric)
      const telegramId = parseInt(userIdentifier);
      existingResult = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [telegramId]
      );
    }

    if (existingResult.rows.length > 0) {
      await client.query('COMMIT');
      return existingResult.rows[0];
    }

    // If identifier was a UUID and user doesn't exist, that's an error
    if (isUUID) {
      throw new Error('User not found');
    }

    // User doesn't exist - create new with proper error handling
    const telegramId = parseInt(userIdentifier);
    const username = userInfo?.username || `user_${telegramId}`;
    const firstName = userInfo?.first_name || 'Player';

    try {
      const insertResult = await client.query(
        `INSERT INTO users (telegram_id, username, first_name, photo_url, gold, wood, stone, meat, jabcoins, treasury_level, storage_level, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         RETURNING *`,
        [telegramId, username, firstName, null, 5000, 2500, 2500, 500, 0, 1, 1]
      );

      const newUser = insertResult.rows[0];

      // Create initial buildings in same transaction
      const buildingTypes = ['mine', 'quarry', 'lumber_mill', 'farm'];
      const productionRates = {
        mine: 100,
        quarry: 80,
        lumber_mill: 90,
        farm: 70,
      };

      for (const type of buildingTypes) {
        await client.query(
          `INSERT INTO user_buildings (user_id, building_type, building_number, level, collected_amount, production_rate, last_activated, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [newUser.id, type, 1, 1, 0, productionRates[type], null]
        );
      }

      await client.query('COMMIT');
      return newUser;
    } catch (insertError) {
      // Handle unique constraint violation (user was created by another request)
      if (insertError.code === '23505') {
        // Try again to get the user (it was just created)
        const retryResult = await client.query(
          'SELECT * FROM users WHERE telegram_id = $1',
          [telegramId]
        );
        
        if (retryResult.rows.length > 0) {
          await client.query('COMMIT');
          return retryResult.rows[0];
        }
      }
      throw insertError;
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}
