import { supabase } from '../bot.js';
import { TROOP_STATS } from '../config/troops.js';

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

export async function getAttackerTroops(userId) {
  const { data: user } = await supabase.from('users').select('id').eq('telegram_id', userId).single();
  
  const { data: attackers } = await supabase
    .from('user_troops')
    .select('level, count')
    .eq('user_id', user.id)
    .eq('troop_type', 'attacker')
    .gt('count', 0);

  return attackers || [];
}

export async function performAttack(userId, targetId) {
  const { data: attackerUser } = await supabase.from('users').select('*').eq('telegram_id', userId).single();
  const { data: targetUser } = await supabase.from('users').select('*').eq('id', targetId).single();

  if (!targetUser) {
    throw new Error('Цель не найдена');
  }

  const now = new Date();
  if (targetUser.shield_until && new Date(targetUser.shield_until) > now) {
    throw new Error('Игрок под защитой');
  }

  const { data: attackerTroops } = await supabase
    .from('user_troops')
    .select('level, count')
    .eq('user_id', attackerUser.id)
    .eq('troop_type', 'attacker')
    .gt('count', 0);

  const { data: defenderTroops } = await supabase
    .from('user_troops')
    .select('level, count')
    .eq('user_id', targetUser.id)
    .eq('troop_type', 'defender')
    .gt('count', 0);

  if (!attackerTroops || attackerTroops.length === 0) {
    throw new Error('У вас нет атакующих воинов');
  }

  const allAttackers = [];
  for (const t of attackerTroops) {
    for (let i = 0; i < t.count; i++) {
      allAttackers.push({ level: t.level, type: 'attacker' });
    }
  }

  const allDefenders = [];
  for (const t of defenderTroops) {
    for (let i = 0; i < t.count; i++) {
      allDefenders.push({ level: t.level, type: 'defender' });
    }
  }

  allAttackers.sort((a, b) => a.level - b.level);
  allDefenders.sort((a, b) => a.level - b.level);

  const attackerCount = allAttackers.length;
  const defenderCount = allDefenders.length;

  let totalAttackerDamage = 0;
  for (const a of allAttackers) {
    totalAttackerDamage += TROOP_STATS.attacker[a.level].damage;
  }

  let totalDefenderDamage = 0;
  for (const d of allDefenders) {
    totalDefenderDamage += TROOP_STATS.defender[d.level].damage;
  }

  const attackerHealthPerUnit = {};
  for (let l = 1; l <= 6; l++) {
    attackerHealthPerUnit[l] = TROOP_STATS.attacker[l].health;
  }
  const defenderHealthPerUnit = {};
  for (let l = 1; l <= 6; l++) {
    defenderHealthPerUnit[l] = TROOP_STATS.defender[l].health;
  }

  const attackerAlive = [...allAttackers];
  const defenderAlive = [...allDefenders];

  const totalAttackerHealth = attackerAlive.reduce((sum, a) => sum + attackerHealthPerUnit[a.level], 0);
  const totalDefenderHealth = defenderAlive.reduce((sum, d) => sum + defenderHealthPerUnit[d.level], 0);

  const attackerKills = Math.min(attackerCount, Math.floor(attackerCount * TROOP_STATS.attacker[1].damage / TROOP_STATS.defender[1].health));
  const defenderKills = Math.min(defenderCount, Math.floor(defenderCount * TROOP_STATS.defender[1].damage / TROOP_STATS.attacker[1].health));

  if (attackerKills > 0) {
    attackerAlive.splice(0, attackerKills);
  }
  if (defenderKills > 0) {
    defenderAlive.splice(0, defenderKills);
  }

  const attackersRemaining = attackerAlive.length;
  const defendersRemaining = defenderAlive.length;

  let loot = { gold: 0, wood: 0, stone: 0, meat: 0 };
  
  if (attackersRemaining > 0 && defendersRemaining === 0) {
    for (const a of attackerAlive) {
      const levelLoot = LOOT_PER_LEVEL[a.level];
      loot.gold += levelLoot.gold;
      loot.wood += levelLoot.wood;
      loot.stone += levelLoot.stone;
      loot.meat += levelLoot.meat;
    }

    const actualLoot = {
      gold: Math.min(loot.gold, targetUser.gold),
      wood: Math.min(loot.wood, targetUser.wood),
      stone: Math.min(loot.stone, targetUser.stone),
      meat: Math.min(loot.meat, targetUser.meat),
    };

    await supabase.from('users').update({
      gold: attackerUser.gold + actualLoot.gold,
      wood: attackerUser.wood + actualLoot.wood,
      stone: attackerUser.stone + actualLoot.stone,
      meat: attackerUser.meat + actualLoot.meat
    }).eq('id', attackerUser.id);

    await supabase.from('users').update({
      gold: targetUser.gold - actualLoot.gold,
      wood: targetUser.wood - actualLoot.wood,
      stone: targetUser.stone - actualLoot.stone,
      meat: targetUser.meat - actualLoot.meat,
      shield_until: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    }).eq('id', targetUser.id);
  } else {
    await supabase.from('users').update({
      shield_until: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    }).eq('id', targetUser.id);
  }

  for (const a of allAttackers.slice(0, attackerKills)) {
    await decrementTroopCount(attackerUser.id, 'attacker', a.level);
  }
  for (const d of allDefenders.slice(0, defenderKills)) {
    await decrementTroopCount(targetUser.id, 'defender', d.level);
  }

  return {
    attackerTroopsCount: attackerCount,
    defenderTroopsCount: defenderCount,
    attackersKilled: attackerKills,
    defendersKilled: defenderKills,
    attackersRemaining,
    defendersRemaining,
    loot,
    won: defendersRemaining === 0
  };
}

async function decrementTroopCount(userId, troopType, level) {
  const { data: troop } = await supabase
    .from('user_troops')
    .select('count')
    .eq('user_id', userId)
    .eq('troop_type', troopType)
    .eq('level', level)
    .single();

  if (troop && troop.count > 0) {
    if (troop.count === 1) {
      await supabase.from('user_troops').delete().eq('user_id', userId).eq('troop_type', troopType).eq('level', level);
    } else {
      await supabase.from('user_troops').update({ count: troop.count - 1 }).eq('user_id', userId).eq('troop_type', troopType).eq('level', level);
    }
  }
}