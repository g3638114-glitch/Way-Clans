import { supabase } from '../bot.js';
import { TROOP_STATS } from '../config/troops.js';
import { withTransaction } from '../database/pg.js';

const LOOT_PER_LEVEL = {
  1: { gold: 31, wood: 15, stone: 15, meat: 1 },
  2: { gold: 62, wood: 30, stone: 30, meat: 2 },
  3: { gold: 125, wood: 60, stone: 60, meat: 4 },
  4: { gold: 400, wood: 150, stone: 150, meat: 10 },
  5: { gold: 800, wood: 300, stone: 300, meat: 20 },
  6: { gold: 2000, wood: 500, stone: 500, meat: 30 },
};

export async function getRandomTarget(userId) {
  const { data: currentUser } = await supabase.from('users').select('id').eq('telegram_id', userId).single();
  
  const now = new Date().toISOString();
  
  const { data: targets, error } = await supabase
    .from('users')
    .select('id, username, first_name, gold, wood, stone, meat, shield_until')
    .neq('id', currentUser.id)
    .or('shield_until.is.null,shield_until.lt.' + now)
    .limit(100);

  if (error || !targets || targets.length === 0) {
    throw new Error('Нет доступных целей для атаки');
  }

  const target = targets[Math.floor(Math.random() * targets.length)];

  const { data: defenders } = await supabase
    .from('user_troops')
    .select('level, count')
    .eq('user_id', target.id)
    .eq('troop_type', 'defender')
    .gt('count', 0);

  return {
    targetId: target.id,
    target: {
      username: target.username,
      first_name: target.first_name,
      gold: target.gold,
      wood: target.wood,
      stone: target.stone,
      meat: target.meat
    },
    defenders: defenders || []
  };
}

export async function performAttack(userId, targetId) {
  return withTransaction(async (client) => {
    const now = new Date();
    const shieldUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const attackerResult = await client.query(
      `SELECT id, telegram_id, gold, wood, stone, meat
       FROM users
       WHERE telegram_id = $1
       FOR UPDATE`,
      [userId]
    );

    if (attackerResult.rows.length === 0) {
      throw new Error('Атакующий не найден');
    }

    const attackerUser = attackerResult.rows[0];

    const targetResult = await client.query(
      `SELECT id, gold, wood, stone, meat, shield_until
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [targetId]
    );

    if (targetResult.rows.length === 0) {
      throw new Error('Цель не найдена');
    }

    const targetUser = targetResult.rows[0];

    if (attackerUser.id === targetUser.id) {
      throw new Error('Нельзя атаковать самого себя');
    }

    if (targetUser.shield_until && new Date(targetUser.shield_until) > now) {
      throw new Error('Игрок под защитой');
    }

    const troopsResult = await client.query(
      `SELECT id, user_id, troop_type, level, count
       FROM user_troops
       WHERE user_id = ANY($1::uuid[]) AND count > 0
       FOR UPDATE`,
      [[attackerUser.id, targetUser.id]]
    );

    const allTroops = troopsResult.rows;
    const attackerTroops = allTroops.filter((t) => t.user_id === attackerUser.id && t.troop_type === 'attacker');
    const defenderTroops = allTroops.filter((t) => t.user_id === targetUser.id && t.troop_type === 'defender');

    if (attackerTroops.length === 0) {
      throw new Error('У вас нет атакующих воинов');
    }

    const attackerCount = attackerTroops.reduce((sum, t) => sum + Number(t.count), 0);
    const defenderCount = defenderTroops.reduce((sum, t) => sum + Number(t.count), 0);
    const totalAttackerDamage = attackerTroops.reduce((sum, t) => sum + TROOP_STATS.attacker[t.level].damage * Number(t.count), 0);
    const totalDefenderDamage = defenderTroops.reduce((sum, t) => sum + TROOP_STATS.defender[t.level].damage * Number(t.count), 0);

    const attackerKills = defenderCount > 0
      ? Math.min(attackerCount, Math.floor(totalDefenderDamage / TROOP_STATS.attacker[1].health))
      : 0;
    const defenderKills = attackerCount > 0
      ? Math.min(defenderCount, Math.floor(totalAttackerDamage / TROOP_STATS.defender[1].health))
      : defenderCount;

    const attackersByLevel = buildLevelCountMap(attackerTroops);
    const defendersByLevel = buildLevelCountMap(defenderTroops);
    const attackerLossesByLevel = applyLossesByLowestLevel(attackersByLevel, attackerKills);
    const defenderLossesByLevel = applyLossesByLowestLevel(defendersByLevel, defenderKills);

    const attackersRemaining = sumLevelCounts(attackersByLevel);
    const defendersRemaining = sumLevelCounts(defendersByLevel);

    let totalLoot = { gold: 0, wood: 0, stone: 0, meat: 0 };

    if (attackersRemaining > 0 && defendersRemaining === 0) {
      for (let level = 1; level <= 6; level++) {
        const survivingCount = attackersByLevel[level];
        if (survivingCount > 0) {
          const lootPerUnit = LOOT_PER_LEVEL[level];
          totalLoot.gold += lootPerUnit.gold * survivingCount;
          totalLoot.wood += lootPerUnit.wood * survivingCount;
          totalLoot.stone += lootPerUnit.stone * survivingCount;
          totalLoot.meat += lootPerUnit.meat * survivingCount;
        }
      }

      totalLoot = {
        gold: Math.min(totalLoot.gold, Number(targetUser.gold)),
        wood: Math.min(totalLoot.wood, Number(targetUser.wood)),
        stone: Math.min(totalLoot.stone, Number(targetUser.stone)),
        meat: Math.min(totalLoot.meat, Number(targetUser.meat)),
      };

      await client.query(
        `UPDATE users
         SET gold = $1, wood = $2, stone = $3, meat = $4
         WHERE id = $5`,
        [
          Number(attackerUser.gold) + totalLoot.gold,
          Number(attackerUser.wood) + totalLoot.wood,
          Number(attackerUser.stone) + totalLoot.stone,
          Number(attackerUser.meat) + totalLoot.meat,
          attackerUser.id,
        ]
      );

      await client.query(
        `UPDATE users
         SET gold = $1, wood = $2, stone = $3, meat = $4, shield_until = $5
         WHERE id = $6`,
        [
          Math.max(0, Number(targetUser.gold) - totalLoot.gold),
          Math.max(0, Number(targetUser.wood) - totalLoot.wood),
          Math.max(0, Number(targetUser.stone) - totalLoot.stone),
          Math.max(0, Number(targetUser.meat) - totalLoot.meat),
          shieldUntil,
          targetUser.id,
        ]
      );
    } else {
      await client.query(
        'UPDATE users SET shield_until = $1 WHERE id = $2',
        [shieldUntil, targetUser.id]
      );
    }

    await persistTroopCounts(client, attackerTroops, attackersByLevel);
    await persistTroopCounts(client, defenderTroops, defendersByLevel);

    return {
      attackerTroopsCount: attackerCount,
      defenderTroopsCount: defenderCount,
      attackersKilled: attackerKills,
      defendersKilled: defenderKills,
      attackersRemaining,
      defendersRemaining,
      attackerLossesByLevel,
      defenderLossesByLevel,
      attackerSurvivorsByLevel: attackersByLevel,
      defenderSurvivorsByLevel: defendersByLevel,
      lootByLevel: defendersRemaining === 0 ? attackersByLevel : {},
      loot: defendersRemaining === 0 ? totalLoot : { gold: 0, wood: 0, stone: 0, meat: 0 },
      shieldUntil,
      won: defendersRemaining === 0,
    };
  });
}

function buildLevelCountMap(troops) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const troop of troops) {
    counts[troop.level] += Number(troop.count);
  }

  return counts;
}

function applyLossesByLowestLevel(levelCounts, totalKills) {
  const losses = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let remainingKills = totalKills;

  for (let level = 1; level <= 6; level++) {
    if (remainingKills <= 0) break;
    const killed = Math.min(levelCounts[level], remainingKills);
    levelCounts[level] -= killed;
    losses[level] = killed;
    remainingKills -= killed;
  }

  return losses;
}

function sumLevelCounts(levelCounts) {
  return Object.values(levelCounts).reduce((sum, count) => sum + Number(count), 0);
}

async function persistTroopCounts(client, troops, survivorCounts) {
  for (const troop of troops) {
    const newCount = survivorCounts[troop.level];
    if (newCount <= 0) {
      await client.query('DELETE FROM user_troops WHERE id = $1', [troop.id]);
    } else {
      await client.query('UPDATE user_troops SET count = $1 WHERE id = $2', [newCount, troop.id]);
    }
  }
}
