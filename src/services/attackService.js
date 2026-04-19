import { supabase } from '../bot.js';
import { withTransaction } from '../database/pg.js';
import { computeLootFromSurvivors, simulateBattle } from '../domain/battleMath.js';

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

    const battle = simulateBattle(attackerTroops, defenderTroops);
    const {
      attackerCount,
      defenderCount,
      attackerKills,
      defenderKills,
      attackersByLevel,
      defendersByLevel,
      attackerLossesByLevel,
      defenderLossesByLevel,
      attackersRemaining,
      defendersRemaining,
    } = battle;

    let totalLoot = { gold: 0, wood: 0, stone: 0, meat: 0 };
    let actualLootByLevel = {};

    if (attackersRemaining > 0 && defendersRemaining === 0) {
      const potentialLoot = computeLootFromSurvivors(attackersByLevel);
      const remainingResources = {
        gold: Number(targetUser.gold),
        wood: Number(targetUser.wood),
        stone: Number(targetUser.stone),
        meat: Number(targetUser.meat),
      };

      totalLoot = {
        gold: Math.min(potentialLoot.gold, remainingResources.gold),
        wood: Math.min(potentialLoot.wood, remainingResources.wood),
        stone: Math.min(potentialLoot.stone, remainingResources.stone),
        meat: Math.min(potentialLoot.meat, remainingResources.meat),
      };

      for (let level = 1; level <= 6; level++) {
        const survivors = Number(attackersByLevel[level] || 0);
        if (!survivors) continue;

        const perUnit = getLootInfo(level);
        const levelLoot = {
          gold: Math.min(remainingResources.gold, perUnit.gold * survivors),
          wood: Math.min(remainingResources.wood, perUnit.wood * survivors),
          stone: Math.min(remainingResources.stone, perUnit.stone * survivors),
          meat: Math.min(remainingResources.meat, perUnit.meat * survivors),
        };

        actualLootByLevel[level] = levelLoot;
        remainingResources.gold -= levelLoot.gold;
        remainingResources.wood -= levelLoot.wood;
        remainingResources.stone -= levelLoot.stone;
        remainingResources.meat -= levelLoot.meat;
      }

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
      actualLootByLevel,
      loot: defendersRemaining === 0 ? totalLoot : { gold: 0, wood: 0, stone: 0, meat: 0 },
      shieldUntil,
      won: defendersRemaining === 0,
    };
  });
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

function getLootInfo(level) {
  return {
    1: { gold: 31, wood: 15, stone: 15, meat: 1 },
    2: { gold: 62, wood: 30, stone: 30, meat: 2 },
    3: { gold: 125, wood: 60, stone: 60, meat: 4 },
    4: { gold: 400, wood: 150, stone: 150, meat: 10 },
    5: { gold: 800, wood: 300, stone: 300, meat: 20 },
    6: { gold: 2000, wood: 500, stone: 500, meat: 30 },
  }[level];
}
