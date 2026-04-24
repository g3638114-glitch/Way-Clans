import { withTransaction } from '../database/pg.js';
import { getCapacity, getProductionRate, getResourceType, getTreasuryCapacity, getWarehouseCapacity } from '../config/buildings.js';
import { applyFinishMineNow, applySpeedUpToBuilding, validateMineFinishNowEligibility, validateSpeedUpEligibility } from './buildingService.js';

const BUILDING_SESSION_TYPE = 'building_collect';
const BUILDING_SPEED_UP_SESSION_TYPE = 'building_speed_up';
const MINE_FINISH_NOW_SESSION_TYPE = 'mine_finish_now';
const BUILDING_BLOCK_SESSION_TYPES = [BUILDING_SESSION_TYPE, BUILDING_SPEED_UP_SESSION_TYPE, MINE_FINISH_NOW_SESSION_TYPE];

async function expireOpenSessions(client, userId, sessionTypes) {
  await client.query(
    `UPDATE ad_reward_sessions
     SET expires_at = NOW()
     WHERE user_id = $1 AND session_type = ANY($2::text[]) AND claimed_at IS NULL`,
    [userId, sessionTypes]
  );
}

async function getLockedSession(client, telegramId, sessionId, sessionType) {
  const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegramId]);
  if (userResult.rows.length === 0) throw new Error('User not found');
  const user = userResult.rows[0];

  const sessionResult = await client.query(
    `SELECT * FROM ad_reward_sessions
     WHERE id = $1 AND user_id = $2 AND session_type = $3
     FOR UPDATE`,
    [sessionId, user.id, sessionType]
  );
  if (sessionResult.rows.length === 0) throw new Error('Reward session not found');

  const session = sessionResult.rows[0];
  if (session.claimed_at) throw new Error('Reward session already claimed');
  if (!session.ad_confirmed_at) throw new Error('Рекламная награда ещё не подтверждена');
  if (new Date(session.expires_at) <= new Date()) throw new Error('Reward session expired');

  return { user, session };
}

export async function createBuildingCollectSession(telegramId, buildingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegramId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const buildingResult = await client.query(
      `SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [buildingId, user.id]
    );
    if (buildingResult.rows.length === 0) throw new Error('Building not found');
    const building = buildingResult.rows[0];

    if (!building.last_activated) {
      throw new Error('Building must be activated first');
    }

    await expireOpenSessions(client, user.id, BUILDING_BLOCK_SESSION_TYPES);

    const productionRate = getProductionRate(building.building_type, building.level || 1);
    const capacity = getCapacity(building.building_type, building.level || 1);
    const lastActivated = new Date(building.last_activated);
    const totalAccumulated = Number(building.collected_amount || 0) + ((Date.now() - lastActivated.getTime()) / 3600000) * productionRate;
    const accumulatedAmount = Math.floor(Math.min(totalAccumulated, capacity));
    const resourceType = getResourceType(building.building_type);

    if (accumulatedAmount <= 0) {
      throw new Error('В здании пока нечего собирать');
    }

    let availableSpace = 0;
    if (resourceType === 'gold') {
      availableSpace = Math.max(0, getTreasuryCapacity(user.treasury_level || 1) - Number(user.gold || 0));
    } else {
      availableSpace = Math.max(0, getWarehouseCapacity(user.warehouse_level || 1) - Number(user[resourceType] || 0));
    }

    if (availableSpace <= 0) {
      throw new Error(resourceType === 'gold'
        ? `Лимит казны достигнут. Вы не можете собрать Jamcoin. Вместимость казны: ${getTreasuryCapacity(user.treasury_level || 1)}, сейчас: ${user.gold || 0}. Освободите место и попробуйте снова.`
        : `Лимит склада достигнут. Вы не можете собрать ресурс. Вместимость склада: ${getWarehouseCapacity(user.warehouse_level || 1)}, сейчас: ${user[resourceType] || 0}. Освободите место и попробуйте снова.`);
    }

    const collectedAmount = Math.min(accumulatedAmount, availableSpace);
    const remainingAmount = Math.max(0, accumulatedAmount - collectedAmount);

    const sessionResult = await client.query(
      `INSERT INTO ad_reward_sessions (user_id, session_type, building_id, resource_type, collected_amount, remaining_amount, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '10 minutes')
       RETURNING *`,
      [user.id, BUILDING_SESSION_TYPE, buildingId, resourceType, collectedAmount, remainingAmount]
    );

    return {
      success: true,
      sessionId: sessionResult.rows[0].id,
      resourceType,
      collectedAmount,
      remainingAmount,
      partialCollection: remainingAmount > 0,
    };
  });
}

export async function finalizeBuildingCollectSession(telegramId, sessionId) {
  return withTransaction(async (client) => {
    const { user, session } = await getLockedSession(client, telegramId, sessionId, BUILDING_SESSION_TYPE);

    const buildingResult = await client.query(
      'SELECT * FROM user_buildings WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [session.building_id, user.id]
    );
    if (buildingResult.rows.length === 0) throw new Error('Building not found');

    const building = buildingResult.rows[0];
    const resourceType = session.resource_type;
    const collectedAmount = Number(session.collected_amount || 0);
    const remainingAmount = Number(session.remaining_amount || 0);

    const updatedBuildingResult = await client.query(
      `UPDATE user_buildings
       SET collected_amount = $1, last_activated = $2
       WHERE id = $3
       RETURNING *`,
      [remainingAmount, new Date().toISOString(), building.id]
    );

    const updatedUserResult = await client.query(
      `UPDATE users
       SET ${resourceType} = $1
       WHERE id = $2
       RETURNING *`,
      [Number(user[resourceType] || 0) + collectedAmount, user.id]
    );

    await client.query('UPDATE ad_reward_sessions SET claimed_at = NOW() WHERE id = $1', [sessionId]);

    return {
      success: true,
      collectedAmount,
      remainingAmount,
      partialCollection: remainingAmount > 0,
      resourceType,
      user: updatedUserResult.rows[0],
      building: updatedBuildingResult.rows[0],
    };
  });
}

export async function confirmBuildingCollectReward(telegramId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE', [telegramId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const sessionResult = await client.query(
      `SELECT id FROM ad_reward_sessions
       WHERE user_id = $1 AND session_type = ANY($2::text[]) AND claimed_at IS NULL AND ad_confirmed_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [user.id, BUILDING_BLOCK_SESSION_TYPES]
    );

    if (sessionResult.rows.length === 0) return { ok: true };
    await client.query('UPDATE ad_reward_sessions SET ad_confirmed_at = NOW() WHERE id = $1', [sessionResult.rows[0].id]);
    return { ok: true };
  });
}

export async function confirmMiningAdReward(telegramId) {
  return { ok: true };
}

export async function createSpeedUpSession(telegramId, buildingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegramId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    await validateSpeedUpEligibility(client, user.id, buildingId);
    await expireOpenSessions(client, user.id, BUILDING_BLOCK_SESSION_TYPES);

    const sessionResult = await client.query(
      `INSERT INTO ad_reward_sessions (user_id, session_type, building_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
       RETURNING *`,
      [user.id, BUILDING_SPEED_UP_SESSION_TYPE, buildingId]
    );

    return { success: true, sessionId: sessionResult.rows[0].id };
  });
}

export async function finalizeSpeedUpSession(telegramId, sessionId) {
  return withTransaction(async (client) => {
    const { user, session } = await getLockedSession(client, telegramId, sessionId, BUILDING_SPEED_UP_SESSION_TYPE);
    const result = await applySpeedUpToBuilding(client, user.id, session.building_id, 2);
    await client.query('UPDATE ad_reward_sessions SET claimed_at = NOW() WHERE id = $1', [sessionId]);
    return result;
  });
}

export async function createMineFinishNowSession(telegramId, buildingId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [telegramId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    await validateMineFinishNowEligibility(client, user.id, buildingId);
    await expireOpenSessions(client, user.id, BUILDING_BLOCK_SESSION_TYPES);

    const sessionResult = await client.query(
      `INSERT INTO ad_reward_sessions (user_id, session_type, building_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
       RETURNING *`,
      [user.id, MINE_FINISH_NOW_SESSION_TYPE, buildingId]
    );

    return { success: true, sessionId: sessionResult.rows[0].id };
  });
}

export async function finalizeMineFinishNowSession(telegramId, sessionId) {
  return withTransaction(async (client) => {
    const { user, session } = await getLockedSession(client, telegramId, sessionId, MINE_FINISH_NOW_SESSION_TYPE);
    const result = await applyFinishMineNow(client, user.id, session.building_id, 2);
    await client.query('UPDATE ad_reward_sessions SET claimed_at = NOW() WHERE id = $1', [sessionId]);
    return result;
  });
}

export async function getMiningAdStatus(telegramId) {
  return { mining_ad_required: false, mining_ad_progress: 0 };
}
