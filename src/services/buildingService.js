import { supabase } from '../bot.js';
import {
  getProductionRate,
  getCapacity,
  getUpgradeCost,
  getResourceType,
  getTreasuryCapacity,
  getWarehouseCapacity,
  getMaxBuildingLevel,
  MINE_SHIFT_HOURS,
  MINE_MEAT_WORKERS,
  MINE_AD_WORKERS,
  MINE_MEAT_COST,
} from '../config/buildings.js';
import { getOrCreateUser } from './userService.js';
import { withTransaction } from '../database/pg.js';

export async function activateBuilding(userId, buildingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');

    const buildingResult = await client.query(
      `SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [buildingId, userResult.rows[0].id]
    );

    if (buildingResult.rows.length === 0) {
      throw new Error('Building not found');
    }

    const building = buildingResult.rows[0];
    if (building.building_type === 'mine') {
      throw new Error('Шахта запускается только через рабочих');
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

export async function collectResourcesFromBuilding(userId, buildingId) {
  return collectBuildingResources(userId, buildingId, 1);
}

export async function collectBuildingResources(userId, buildingId, rewardMultiplier = 1) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const buildingResult = await client.query(
      `SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [buildingId, user.id]
    );

    if (buildingResult.rows.length === 0) {
      throw new Error('Building not found');
    }

    let building = buildingResult.rows[0];
    if (building.building_type === 'mine') {
      building = await syncMineShiftState(client, building);
    }

    if (building.building_type === 'mine') {
      if (Number(rewardMultiplier || 1) > 1) {
        throw new Error('Сбор x2 доступен только для фермы, лесопилки и каменоломни');
      }
      return collectMineResources(client, user, building);
    }

    return collectStandardBuildingResources(client, user, building, rewardMultiplier);
  });
}

function collectStandardBuildingResources(client, user, building, rewardMultiplier = 1) {
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

  const effectiveMultiplier = Math.max(1, Number(rewardMultiplier || 1));
  let baseCollectedAmount = accumulatedAmount;
  let collectedAmount = accumulatedAmount;
  if (resourceType === 'gold') {
    const treasuryCapacity = getTreasuryCapacity(user.treasury_level || 1);
    const availableSpace = Math.max(0, treasuryCapacity - Number(user.gold || 0));
    if (availableSpace <= 0) {
      throw new Error(`Лимит казны достигнут. Вы не можете собрать Jamcoin. Вместимость казны: ${treasuryCapacity}, сейчас: ${user.gold || 0}. Освободите место и попробуйте снова.`);
    }
    if (effectiveMultiplier > 1) {
      baseCollectedAmount = Math.min(accumulatedAmount, Math.floor(availableSpace / effectiveMultiplier));
      if (baseCollectedAmount <= 0) {
        throw new Error('Недостаточно места в казне для сбора x2. Освободите место и попробуйте снова.');
      }
      collectedAmount = baseCollectedAmount * effectiveMultiplier;
    } else {
      baseCollectedAmount = Math.min(accumulatedAmount, availableSpace);
      collectedAmount = baseCollectedAmount;
    }
  } else {
    const warehouseCapacity = getWarehouseCapacity(user.warehouse_level || 1);
    const availableSpace = Math.max(0, warehouseCapacity - Number(user[resourceType] || 0));
    if (availableSpace <= 0) {
      const resourceNames = { wood: 'дерево', stone: 'камень', meat: 'мясо' };
      throw new Error(`Лимит склада достигнут. Вы не можете собрать ${resourceNames[resourceType]}. Вместимость склада: ${warehouseCapacity}, сейчас: ${user[resourceType] || 0}. Освободите место и попробуйте снова.`);
    }
    if (effectiveMultiplier > 1) {
      baseCollectedAmount = Math.min(accumulatedAmount, Math.floor(availableSpace / effectiveMultiplier));
      if (baseCollectedAmount <= 0) {
        throw new Error('Недостаточно места на складе для сбора x2. Освободите место и попробуйте снова.');
      }
      collectedAmount = baseCollectedAmount * effectiveMultiplier;
    } else {
      baseCollectedAmount = Math.min(accumulatedAmount, availableSpace);
      collectedAmount = baseCollectedAmount;
    }
  }

  const remainingAmount = Math.max(0, accumulatedAmount - baseCollectedAmount);
  return finalizeCollect(client, user, building, resourceType, collectedAmount, remainingAmount, {
    setLastActivatedNow: true,
    partialCollection: remainingAmount > 0,
  });
}

export async function speedUpBuildingProduction(userId, buildingId, speedMultiplier = 2) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    return applySpeedUpToBuilding(client, userResult.rows[0].id, buildingId, speedMultiplier);
  });
}

function collectMineResources(client, user, building) {
  if (isMineShiftActive(building)) {
    throw new Error('Нельзя собирать Jamcoin, пока шахта работает');
  }

  const resourceType = 'gold';
  const accumulatedAmount = Math.floor(Number(building.current_accumulated || building.collected_amount || 0));
  if (accumulatedAmount <= 0) {
    throw new Error('В шахте пока нечего собирать');
  }

  const treasuryCapacity = getTreasuryCapacity(user.treasury_level || 1);
  const availableSpace = Math.max(0, treasuryCapacity - Number(user.gold || 0));
  if (availableSpace <= 0) {
    throw new Error(`Лимит казны достигнут. Вы не можете собрать Jamcoin. Вместимость казны: ${treasuryCapacity}, сейчас: ${user.gold || 0}. Освободите место и попробуйте снова.`);
  }

  const collectedAmount = Math.min(accumulatedAmount, availableSpace);
  const remainingAmount = Math.max(0, accumulatedAmount - collectedAmount);

  const updateData = buildMineCollectUpdate(building, remainingAmount);
  return finalizeCollect(client, user, building, resourceType, collectedAmount, remainingAmount, {
    buildingUpdate: updateData,
    partialCollection: remainingAmount > 0,
  });
}

async function finalizeCollect(client, user, building, resourceType, collectedAmount, remainingAmount, options = {}) {
  const buildingUpdate = options.buildingUpdate || {
    collected_amount: remainingAmount,
    last_activated: options.setLastActivatedNow ? new Date().toISOString() : building.last_activated,
  };

  const updatedBuildingResult = await client.query(
    `UPDATE user_buildings
     SET collected_amount = $1,
         last_activated = $2,
         worker_count = $3,
         work_started_at = $4,
         work_ends_at = $5,
         work_mode = $6
     WHERE id = $7
     RETURNING *`,
    [
      Number(buildingUpdate.collected_amount || 0),
      buildingUpdate.last_activated || null,
      Number(buildingUpdate.worker_count || 0),
      buildingUpdate.work_started_at || null,
      buildingUpdate.work_ends_at || null,
      buildingUpdate.work_mode || null,
      building.id,
    ]
  );

  const updatedUserResult = await client.query(
    `UPDATE users SET ${resourceType} = $1 WHERE id = $2 RETURNING *`,
    [Number(user[resourceType] || 0) + collectedAmount, user.id]
  );

  return {
    success: true,
    collectedAmount,
    accumulatedAmount: Math.floor(Number(building.current_accumulated || building.collected_amount || 0)),
    remainingAmount,
    partialCollection: Boolean(options.partialCollection),
    resourceType,
    user: updatedUserResult.rows[0],
    building: updatedBuildingResult.rows[0],
  };
}

export async function startMineWorkers(userId, buildingId, mode) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const buildingResult = await client.query('SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE', [buildingId, user.id]);
    if (buildingResult.rows.length === 0) throw new Error('Building not found');

    let building = buildingResult.rows[0];
    if (building.building_type !== 'mine') {
      throw new Error('Рабочие доступны только для шахты');
    }

    building = await syncMineShiftState(client, building);

    if (isMineShiftActive(building)) {
      throw new Error('Рабочие уже трудятся в шахте');
    }

    let workerCount = 0;
    let nextMeat = Number(user.meat || 0);

    if (mode === 'meat_100') {
      if (nextMeat < MINE_MEAT_COST) {
        throw new Error(`Недостаточно мяса. Нужно ${MINE_MEAT_COST}, у вас ${nextMeat}`);
      }
      workerCount = MINE_MEAT_WORKERS;
      nextMeat -= MINE_MEAT_COST;
    } else if (mode === 'ad_300') {
      ensureMineCooldownAvailable(building.mine_ad_300_cooldown_until, 'Нанять 300 рабочих');
      workerCount = MINE_AD_WORKERS;
    } else {
      throw new Error('Invalid mine mode');
    }

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + MINE_SHIFT_HOURS * 60 * 60 * 1000);

    const updatedUserResult = await client.query(
      'UPDATE users SET meat = $1 WHERE id = $2 RETURNING *',
      [nextMeat, user.id]
    );

    const mineAdCooldownUntil = mode === 'ad_300'
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : building.mine_ad_300_cooldown_until || null;

    const updatedBuildingResult = await client.query(
      `UPDATE user_buildings
       SET worker_count = $1, work_started_at = $2, work_ends_at = $3, work_mode = $4, mine_ad_300_cooldown_until = $5
       WHERE id = $6
       RETURNING *`,
      [workerCount, startAt.toISOString(), endAt.toISOString(), mode, mineAdCooldownUntil, building.id]
    );

    return {
      success: true,
      user: updatedUserResult.rows[0],
      building: updatedBuildingResult.rows[0],
    };
  });
}

export async function finishMineWorkNow(userId, buildingId, rewardMultiplier = 2) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    return applyFinishMineNow(client, userResult.rows[0].id, buildingId, rewardMultiplier);
  });
}

export async function applySpeedUpToBuilding(client, userIdDb, buildingId, speedMultiplier = 2) {
  const { building, currentAccumulated, capacity, productionRate } = await validateSpeedUpEligibility(client, userIdDb, buildingId);

  const beforeAmount = Math.floor(currentAccumulated);
  const oneHourProduction = Math.max(0, Number(productionRate || 0));
  const nextCollectedAmount = Math.floor(Math.min(capacity, currentAccumulated + oneHourProduction));
  const afterAmount = Math.max(beforeAmount, nextCollectedAmount);
  const addedAmount = Math.max(0, afterAmount - beforeAmount);
  const remainingHoursBefore = productionRate > 0 ? Math.max(0, (capacity - currentAccumulated) / productionRate) : 0;
  const remainingHoursAfter = productionRate > 0 ? Math.max(0, (capacity - afterAmount) / productionRate) : 0;

  const updatedBuildingResult = await client.query(
    `UPDATE user_buildings
     SET collected_amount = $1, last_activated = $2
     WHERE id = $3
     RETURNING *`,
    [nextCollectedAmount, new Date().toISOString(), building.id]
  );

  return {
    success: true,
    building: updatedBuildingResult.rows[0],
    beforeAmount,
    afterAmount,
    addedAmount,
    capacity,
    acceleratedAmount: addedAmount,
    currentAccumulated: beforeAmount,
    remainingHoursBefore,
    remainingHoursAfter,
  };
}

export async function validateSpeedUpEligibility(client, userIdDb, buildingId) {
  const buildingResult = await client.query(
    `SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
    [buildingId, userIdDb]
  );
  if (buildingResult.rows.length === 0) throw new Error('Building not found');

  const building = buildingResult.rows[0];
  if (building.building_type === 'mine') {
    throw new Error('Ускорение x2 доступно только для фермы, лесопилки и каменоломни');
  }
  if (!building.last_activated) {
    throw new Error('Сначала активируйте здание');
  }

  const level = building.level || 1;
  const productionRate = getProductionRate(building.building_type, level);
  const capacity = getCapacity(building.building_type, level);
  const lastActivated = new Date(building.last_activated);
  const elapsedHours = Math.max(0, (Date.now() - lastActivated.getTime()) / 3600000);
  const currentAccumulated = Math.min(Number(building.collected_amount || 0) + elapsedHours * productionRate, capacity);
  if (currentAccumulated >= capacity) {
    throw new Error('Здание уже заполнено, дополнительный час не требуется');
  }

  return {
    building,
    currentAccumulated,
    capacity,
    productionRate,
  };
}

export async function applyFinishMineNow(client, userIdDb, buildingId, rewardMultiplier = 2) {
  const building = await validateMineFinishNowEligibility(client, userIdDb, buildingId);
  const finalizedBuilding = await settleMineShiftImmediately(client, building, null, rewardMultiplier);
  return { success: true, building: finalizedBuilding };
}

export async function validateMineFinishNowEligibility(client, userIdDb, buildingId) {
  const buildingResult = await client.query('SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE', [buildingId, userIdDb]);
  if (buildingResult.rows.length === 0) throw new Error('Building not found');

  const building = buildingResult.rows[0];
  if (building.building_type !== 'mine') {
    throw new Error('Собрать сразу доступно только для шахты');
  }
  ensureMineCooldownAvailable(building.mine_finish_now_cooldown_until, 'Собрать сразу x2');
  if (!isMineShiftActive(building)) {
    throw new Error('В шахте нет активной смены рабочих');
  }

  return building;
}

export async function applyMineFinishNowCooldown(client, buildingId) {
  const updatedBuildingResult = await client.query(
    `UPDATE user_buildings
     SET mine_finish_now_cooldown_until = $1
     WHERE id = $2
     RETURNING *`,
    [new Date(Date.now() + 60 * 60 * 1000).toISOString(), buildingId]
  );
  return updatedBuildingResult.rows[0];
}

function ensureMineCooldownAvailable(cooldownUntil, actionLabel) {
  if (!cooldownUntil) return;
  const remainingMs = new Date(cooldownUntil).getTime() - Date.now();
  if (remainingMs <= 0) return;

  throw new Error(`${actionLabel} будет доступно через ${formatCooldownRemaining(remainingMs)}`);
}

function formatCooldownRemaining(remainingMs) {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${totalMinutes}м`;
  if (minutes <= 0) return `${hours}ч`;
  return `${hours}ч ${minutes}м`;
}

export async function upgradeBuilding(userId, buildingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const buildingResult = await client.query(
      `SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [buildingId, user.id]
    );

    if (buildingResult.rows.length === 0) throw new Error('Building not found');
    const building = buildingResult.rows[0];
    const currentLevel = building.level || 1;

    const maxLevel = getMaxBuildingLevel();
    if (currentLevel >= maxLevel) {
      throw new Error(`Building is already at maximum level (${maxLevel})`);
    }

    const nextLevel = currentLevel + 1;
    const costData = getUpgradeCost(building.building_type, nextLevel);
    if (!costData) throw new Error('Invalid level for upgrade');

    if (building.building_type === 'mine' && isMineShiftActive(building)) {
      throw new Error('Нельзя улучшить шахту, пока рабочие трудятся');
    }

    let nextGold = Number(user.gold || 0);
    let nextStone = Number(user.stone || 0);
    let nextWood = Number(user.wood || 0);

    if (building.building_type === 'mine') {
      if (nextStone < costData.stone) throw new Error(`Not enough stone. Need ${costData.stone}, have ${nextStone}`);
      if (nextWood < costData.wood) throw new Error(`Not enough wood. Need ${costData.wood}, have ${nextWood}`);
      nextStone -= costData.stone;
      nextWood -= costData.wood;
    } else {
      if (nextGold < costData.gold) throw new Error(`Not enough gold. Need ${costData.gold}, have ${nextGold}`);
      nextGold -= costData.gold;
    }

    await client.query('UPDATE users SET gold = $1, stone = $2, wood = $3 WHERE id = $4', [nextGold, nextStone, nextWood, user.id]);

    const updatedBuildingResult = await client.query(
      `UPDATE user_buildings
       SET level = $1, production_rate = $2
       WHERE id = $3
       RETURNING *`,
      [nextLevel, getProductionRate(building.building_type, nextLevel), building.id]
    );

    const updatedUserResult = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
    return { success: true, cost: costData, user: updatedUserResult.rows[0], building: updatedBuildingResult.rows[0] };
  });
}

export async function getUserBuildings(userId) {
  const user = await getOrCreateUser(userId);

  const { data: buildings, error } = await supabase
    .from('user_buildings')
    .select('*')
    .eq('user_id', user.id)
    .order('building_type', { ascending: true })
    .order('building_number', { ascending: true });

  if (error) throw new Error('Failed to fetch buildings');

  const now = new Date();
  const buildingsWithProgress = buildings.map((building) => buildBuildingViewModel(building, now));
  return buildingsWithProgress;
}

function buildBuildingViewModel(building, now = new Date()) {
  const level = building.level || 1;
  const productionRate = getProductionRate(building.building_type, level);
  const capacity = getCapacity(building.building_type, level);

  if (building.building_type === 'mine') {
    const mineState = calculateMineState(building, now);
    return {
      ...building,
      currentAccumulated: mineState.currentAccumulated,
      capacity,
      productionRate,
      level,
      isAtCapacity: mineState.currentAccumulated >= capacity,
      isFull: mineState.currentAccumulated >= capacity,
      progress: capacity > 0 ? (mineState.currentAccumulated / capacity) * 100 : 0,
      mineShiftActive: mineState.shiftActive,
      mineWorkerCount: mineState.workerCount,
      mineWorkEndsAt: mineState.workEndsAt,
      mineRemainingMs: mineState.remainingMs,
      mineRatePerHour: mineState.ratePerHour,
      mineStoredAmount: mineState.currentAccumulated,
    };
  }

  let currentAccumulated = Number(building.collected_amount || 0);
  if (building.last_activated) {
    const lastActivated = new Date(building.last_activated);
    const hoursPassed = (now - lastActivated) / 3600000;
    currentAccumulated = Math.min(currentAccumulated + hoursPassed * productionRate, capacity);
  }

  return {
    ...building,
    currentAccumulated,
    capacity,
    productionRate,
    level,
    isAtCapacity: currentAccumulated >= capacity,
    isFull: currentAccumulated >= capacity,
    progress: capacity > 0 ? (currentAccumulated / capacity) * 100 : 0,
  };
}

function calculateMineState(building, now = new Date()) {
  const level = building.level || 1;
  const baseProductionRate = getProductionRate('mine', level);
  const capacity = getCapacity('mine', level);
  const stored = Number(building.collected_amount || 0);
  const workerCount = Number(building.worker_count || 0);
  const startedAt = building.work_started_at ? new Date(building.work_started_at) : null;
  const endsAt = building.work_ends_at ? new Date(building.work_ends_at) : null;

  if (!workerCount || !startedAt || !endsAt) {
    return {
      currentAccumulated: Math.min(stored, capacity),
      shiftActive: false,
      workerCount: 0,
      workEndsAt: null,
      remainingMs: 0,
      ratePerHour: 0,
    };
  }

  const effectiveEnd = now < endsAt ? now : endsAt;
  const elapsedHours = Math.max(0, (effectiveEnd.getTime() - startedAt.getTime()) / 3600000);
  const multiplier = workerCount / MINE_MEAT_WORKERS;
  const produced = elapsedHours * baseProductionRate * multiplier;
  const currentAccumulated = Math.min(capacity, stored + produced);
  const shiftActive = now < endsAt;

  return {
    currentAccumulated,
    shiftActive,
    workerCount: shiftActive ? workerCount : 0,
    workEndsAt: shiftActive ? endsAt.toISOString() : null,
    remainingMs: shiftActive ? Math.max(0, endsAt.getTime() - now.getTime()) : 0,
    ratePerHour: baseProductionRate * multiplier,
  };
}

async function syncMineShiftState(client, building) {
  if (building.building_type !== 'mine' || !building.worker_count || !building.work_ends_at || !building.work_started_at) {
    return building;
  }

  const now = new Date();
  const endsAt = new Date(building.work_ends_at);
  if (now < endsAt) {
    return building;
  }

  return settleMineShiftImmediately(client, building, endsAt);
}

async function settleMineShiftImmediately(client, building, settleAt = null, rewardMultiplier = 1) {
  const workEndsAt = new Date(building.work_ends_at);
  const effectiveEnd = settleAt || workEndsAt;
  const level = building.level || 1;
  const baseProductionRate = getProductionRate('mine', level);
  const capacity = getCapacity('mine', level);
  const stored = Number(building.collected_amount || 0);
  const startedAt = new Date(building.work_started_at);
  const cappedEnd = effectiveEnd < workEndsAt ? effectiveEnd : workEndsAt;
  const elapsedHours = Math.max(0, (cappedEnd.getTime() - startedAt.getTime()) / 3600000);
  const multiplier = Number(building.worker_count || 0) / MINE_MEAT_WORKERS;
  const produced = elapsedHours * baseProductionRate * multiplier * Math.max(1, Number(rewardMultiplier || 1));
  const nextCollected = Math.min(capacity, stored + produced);

  const updateResult = await client.query(
    `UPDATE user_buildings
     SET collected_amount = $1,
         worker_count = 0,
         work_started_at = NULL,
         work_ends_at = NULL,
         work_mode = NULL
     WHERE id = $2
     RETURNING *`,
    [Math.floor(nextCollected), building.id]
  );

  return updateResult.rows[0];
}

function buildMineCollectUpdate(building, remainingAmount) {
  if (!isMineShiftActive(building)) {
    return {
      collected_amount: remainingAmount,
      last_activated: building.last_activated,
      worker_count: 0,
      work_started_at: null,
      work_ends_at: null,
      work_mode: null,
    };
  }

  return {
    collected_amount: remainingAmount,
    last_activated: building.last_activated,
    worker_count: Number(building.worker_count || 0),
    work_started_at: new Date().toISOString(),
    work_ends_at: building.work_ends_at,
    work_mode: building.work_mode,
  };
}

function isMineShiftActive(building) {
  return Boolean(
    building.worker_count &&
    building.work_started_at &&
    building.work_ends_at &&
    new Date(building.work_ends_at) > new Date()
  );
}
