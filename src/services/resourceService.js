import { getTreasuryCapacity } from '../config/buildings.js';
import { withTransaction } from '../database/pg.js';

const RESOURCE_PRICES = {
  wood: 10,
  stone: 15,
  meat: 25,
};

const EXCHANGE_CONFIG = {
  MIN_EXCHANGE: 1000000,
  EXCHANGE_RATE: 1000000, // 1000000 Jamcoin (gold) = 1 jabcoin
};

export async function sellResources(userId, { wood = 0, stone = 0, meat = 0 }) {
  // Calculate gold from sold resources
  const goldEarned = (wood || 0) * RESOURCE_PRICES.wood
    + (stone || 0) * RESOURCE_PRICES.stone
    + (meat || 0) * RESOURCE_PRICES.meat;

  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    if ((wood || 0) > Number(user.wood) || (stone || 0) > Number(user.stone) || (meat || 0) > Number(user.meat)) {
      throw new Error('Not enough resources');
    }

    const capacity = getTreasuryCapacity(user.treasury_level || 1);
    const newGoldAmount = Number(user.gold || 0) + goldEarned;
    if (newGoldAmount > capacity) {
      throw new Error(`Лимит казны достигнут. Продажа невозможна: вы получите ${goldEarned} Jamcoin, а в казне уже ${user.gold || 0} из ${capacity}. Освободите место и попробуйте снова.`);
    }

    const updatedUserResult = await client.query(
      `UPDATE users
       SET wood = $1, stone = $2, meat = $3, gold = $4
       WHERE id = $5
       RETURNING *`,
      [Number(user.wood) - (wood || 0), Number(user.stone) - (stone || 0), Number(user.meat) - (meat || 0), newGoldAmount, user.id]
    );

    return { success: true, user: updatedUserResult.rows[0] };
  });
}

export async function exchangeGold(userId, goldAmount) {
  if (goldAmount < EXCHANGE_CONFIG.MIN_EXCHANGE) {
    throw new Error(`Minimum exchange is ${EXCHANGE_CONFIG.MIN_EXCHANGE} Jamcoin`);
  }

  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    if (Number(user.gold) < goldAmount) {
      throw new Error('Not enough Jamcoin');
    }

    const jabcoinsGained = Math.floor(goldAmount / EXCHANGE_CONFIG.EXCHANGE_RATE);
    const updatedUserResult = await client.query(
      `UPDATE users
       SET gold = $1, jabcoins = $2
       WHERE id = $3
       RETURNING *`,
      [Number(user.gold) - goldAmount, Number(user.jabcoins) + jabcoinsGained, user.id]
    );

    return { success: true, user: updatedUserResult.rows[0], jabcoinsGained };
  });
}

export async function addGold(userId, goldAmount) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const capacity = getTreasuryCapacity(user.treasury_level || 1);
    const newGoldAmount = Number(user.gold || 0) + goldAmount;
    if (newGoldAmount > capacity) {
      throw new Error(`Лимит казны достигнут. Вы не можете получить ещё ${goldAmount} Jamcoin. Вместимость казны: ${capacity}, сейчас: ${user.gold || 0}. Обменяйте или потратьте Jamcoin и попробуйте снова.`);
    }

    const updatedUserResult = await client.query(
      `UPDATE users
       SET gold = $1, jamcoins_from_clicks = $2
       WHERE id = $3
       RETURNING *`,
      [newGoldAmount, Number(user.jamcoins_from_clicks || 0) + goldAmount, user.id]
    );

    return { success: true, user: updatedUserResult.rows[0] };
  });
}
