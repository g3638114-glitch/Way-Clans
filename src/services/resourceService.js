import { getTreasuryCapacity } from '../config/buildings.js';
import { withTransaction } from '../database/pg.js';

const DEFAULT_ENERGY_CAPACITY = 600;

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

    const today = getMoscowDateString();
    const shouldResetEnergy = normalizeDateValue(user.last_energy_reset) !== today;
    const energyCapacity = Number(user.energy_capacity ?? DEFAULT_ENERGY_CAPACITY);
    const energy = shouldResetEnergy ? energyCapacity : Number(user.energy ?? energyCapacity);
    const energyCost = Math.max(1, Math.floor(goldAmount / 100));
    if (energy < energyCost) {
      throw new Error('Энергия закончилась. Восполните её, чтобы продолжить майнинг.');
    }

    const capacity = getTreasuryCapacity(user.treasury_level || 1);
    const newGoldAmount = Number(user.gold || 0) + goldAmount;
    if (newGoldAmount > capacity) {
      throw new Error(`Лимит казны достигнут. Вы не можете получить ещё ${goldAmount} Jamcoin. Вместимость казны: ${capacity}, сейчас: ${user.gold || 0}. Обменяйте или потратьте Jamcoin и попробуйте снова.`);
    }

    const updatedUserResult = await client.query(
      `UPDATE users
       SET gold = $1, jamcoins_from_clicks = $2, energy = $3, last_energy_reset = $4
       WHERE id = $5
       RETURNING *`,
      [newGoldAmount, Number(user.jamcoins_from_clicks || 0) + goldAmount, energy - energyCost, shouldResetEnergy ? today : (user.last_energy_reset || today), user.id]
    );

    return { success: true, user: updatedUserResult.rows[0] };
  });
}

export async function refillEnergy(userId) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const today = getMoscowDateString();
    const capacity = Number(user.energy_capacity || DEFAULT_ENERGY_CAPACITY);
    const shouldResetEnergy = normalizeDateValue(user.last_energy_reset) !== today;
    const currentEnergy = shouldResetEnergy ? capacity : Number(user.energy || 0);

    if (currentEnergy >= capacity) {
      if (shouldResetEnergy) {
        const updatedUserResult = await client.query(
          `UPDATE users SET energy = $1, last_energy_reset = $2 WHERE id = $3 RETURNING *`,
          [capacity, today, user.id]
        );
        return { success: true, user: updatedUserResult.rows[0] };
      }
      return { success: true, user };
    }

    const updatedUserResult = await client.query(
      `UPDATE users
       SET energy = $1, last_energy_reset = $2
       WHERE id = $3
       RETURNING *`,
      [capacity, shouldResetEnergy ? today : (user.last_energy_reset || today), user.id]
    );

    return { success: true, user: updatedUserResult.rows[0] };
  });
}

function getMoscowDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function normalizeDateValue(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return getMoscowDateString(parsed);
}
