import { supabase } from '../bot.js';
import { TROOP_STATS, HIRE_COSTS } from '../config/troops.js';
import { getUserByTelegramId } from './userService.js';
import { withTransaction } from '../database/pg.js';

export async function getUserTroops(userId) {
  const user = await getUserByTelegramId(userId, 'id, attacker_level, defender_level');
  const { data: troops } = await supabase.from('user_troops').select('*').eq('user_id', user.id);
  return { attacker_level: user.attacker_level, defender_level: user.defender_level, troops: troops || [] };
}

export async function hireTroop(userId, type, quantity = 1) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const level = type === 'attacker' ? user.attacker_level : user.defender_level;
    const cost = HIRE_COSTS[type];
    const totalCost = {
      gold: cost.gold * quantity,
      wood: cost.wood * quantity,
      stone: cost.stone * quantity,
      meat: cost.meat * quantity,
    };

    if (
      Number(user.gold) < totalCost.gold ||
      Number(user.wood) < totalCost.wood ||
      Number(user.stone) < totalCost.stone ||
      Number(user.meat) < totalCost.meat
    ) {
      throw new Error('Недостаточно ресурсов для найма');
    }

    await client.query(
      `UPDATE users
       SET gold = $1, wood = $2, stone = $3, meat = $4
       WHERE id = $5`,
      [
        Number(user.gold) - totalCost.gold,
        Number(user.wood) - totalCost.wood,
        Number(user.stone) - totalCost.stone,
        Number(user.meat) - totalCost.meat,
        user.id,
      ]
    );

    const troopResult = await client.query(
      `SELECT * FROM user_troops
       WHERE user_id = $1 AND troop_type = $2 AND level = $3
       FOR UPDATE`,
      [user.id, type, level]
    );

    if (troopResult.rows.length > 0) {
      const existing = troopResult.rows[0];
      await client.query('UPDATE user_troops SET count = $1 WHERE id = $2', [Number(existing.count) + quantity, existing.id]);
    } else {
      await client.query(
        'INSERT INTO user_troops (user_id, troop_type, level, count) VALUES ($1, $2, $3, $4)',
        [user.id, type, level, quantity]
      );
    }

    const updatedUserResult = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
    const updatedTroopsResult = await client.query('SELECT * FROM user_troops WHERE user_id = $1', [user.id]);

    return { user: updatedUserResult.rows[0], troops: updatedTroopsResult.rows };
  });
}

export async function upgradeTroopType(userId, type) {
  return withTransaction(async (client) => {
    const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const currentLevel = type === 'attacker' ? user.attacker_level : user.defender_level;
    if (currentLevel >= 6) throw new Error('Максимальный уровень достигнут');

    const nextLevel = currentLevel + 1;
    const cost = TROOP_STATS[type][nextLevel].cost;
    const nextGold = cost.gold ? Number(user.gold) - cost.gold : Number(user.gold);
    const nextMeat = cost.meat ? Number(user.meat) - cost.meat : Number(user.meat);
    const nextJabcoins = cost.jabcoins ? Number(user.jabcoins) - cost.jabcoins : Number(user.jabcoins);

    if (nextGold < 0) throw new Error('Недостаточно Jamcoin');
    if (nextMeat < 0) throw new Error('Недостаточно мяса');
    if (nextJabcoins < 0) throw new Error('Недостаточно Jabcoin');

    const levelField = type === 'attacker' ? 'attacker_level' : 'defender_level';
    const updatedUserResult = await client.query(
      `UPDATE users
       SET gold = $1, meat = $2, jabcoins = $3, ${levelField} = $4
       WHERE id = $5
       RETURNING *`,
      [nextGold, nextMeat, nextJabcoins, nextLevel, user.id]
    );

    return { user: updatedUserResult.rows[0] };
  });
}
