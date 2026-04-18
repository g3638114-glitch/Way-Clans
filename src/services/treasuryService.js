import { supabase } from '../bot.js';
import { getTreasuryCapacity, getTreasuryUpgradeCost, getMaxTreasuryLevel } from '../config/buildings.js';
import { getUserByTelegramId } from './userService.js';
import { withTransaction } from '../database/pg.js';

/**
 * Get treasury info for a user
 * Treasury stores Jamcoin 💰 (gold)
 */
export async function getUserTreasury(userId) {
  const user = await getUserByTelegramId(userId);

  const treasuryLevel = user.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);
  const maxLevel = getMaxTreasuryLevel();

  return {
    userId: user.id,
    currentLevel: treasuryLevel,
    maxLevel: maxLevel,
    currentJamcoins: user.gold || 0,
    capacity: capacity,
    isFull: (user.gold || 0) >= capacity,
    progress: capacity > 0 ? ((user.gold || 0) / capacity) * 100 : 0,
  };
}

/**
 * Upgrade treasury to the next level
 * Requires jamcoins (gold), stone, and wood
 */
export async function upgradeTreasury(userId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const currentLevel = user.treasury_level || 1;
    const maxLevel = getMaxTreasuryLevel();
    if (currentLevel >= maxLevel) {
      throw new Error(`Treasury is already at maximum level (${maxLevel})`);
    }

    const nextLevel = currentLevel + 1;
    const costData = getTreasuryUpgradeCost(nextLevel);
    if (!costData) throw new Error('Invalid level for upgrade');

    const nextGold = Number(user.gold) - costData.jamcoins;
    const nextStone = Number(user.stone) - costData.stone;
    const nextWood = Number(user.wood) - costData.wood;

    if (nextGold < 0) throw new Error(`Not enough Jamcoin. Need ${costData.jamcoins}, have ${user.gold || 0}`);
    if (nextStone < 0) throw new Error(`Not enough stone. Need ${costData.stone}, have ${user.stone || 0}`);
    if (nextWood < 0) throw new Error(`Not enough wood. Need ${costData.wood}, have ${user.wood || 0}`);

    const updatedUserResult = await client.query(
      `UPDATE users
       SET gold = $1, stone = $2, wood = $3, treasury_level = $4
       WHERE id = $5
       RETURNING *`,
      [nextGold, nextStone, nextWood, nextLevel, user.id]
    );

    return {
      success: true,
      cost: costData,
      newLevel: nextLevel,
      newCapacity: getTreasuryCapacity(nextLevel),
      user: updatedUserResult.rows[0],
    };
  });
}

/**
 * Check if treasury is full (used when collecting resources)
 * Treasury stores Jamcoin 💰 (gold)
 */
export async function isTreasuryFull(userId) {
  const user = await getUserByTelegramId(userId);

  const treasuryLevel = user.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);

  return (user.gold || 0) >= capacity;
}
