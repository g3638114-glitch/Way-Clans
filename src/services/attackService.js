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

export async function performAttack(userId, targetId) {
  const now = new Date();

  const { data: attackerUser, error: attackerError } = await supabase
    .from('users')
    .select('id, telegram_id, gold, wood, stone, meat')
    .eq('telegram_id', userId)
    .single();

  if (attackerError || !attackerUser) {
    throw new Error('Ошибка при загрузке данных атакующего');
  }

  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('id, gold, wood, stone, meat, shield_until')
    .eq('id', targetId)
    .single();

  if (targetError || !targetUser) {
    throw new Error('Цель не найдена');
  }

  if (targetUser.shield_until && new Date(targetUser.shield_until) > now) {
    throw new Error('Игрок под защитой');
  }

  const { data: allTroops } = await supabase
    .from('user_troops')
    .select('user_id, troop_type, level, count')
    .in('user_id', [attackerUser.id, targetUser.id])
    .gt('count', 0);

  if (!allTroops) {
    throw new Error('Ошибка при загрузке войск');
  }

  const attackerTroops = allTroops.filter(t => t.user_id === attackerUser.id && t.troop_type === 'attacker');
  const defenderTroops = allTroops.filter(t => t.user_id === targetUser.id && t.troop_type === 'defender');

  if (!attackerTroops || attackerTroops.length === 0) {
    throw new Error('У вас нет атакующих воинов');
  }

  let totalAttackerDamage = 0;
  for (const t of attackerTroops) {
    const damage = TROOP_STATS.attacker[t.level].damage;
    totalAttackerDamage += damage * t.count;
  }

  let totalDefenderDamage = 0;
  for (const t of defenderTroops) {
    const damage = TROOP_STATS.defender[t.level].damage;
    totalDefenderDamage += damage * t.count;
  }

  let attackerCount = 0;
  for (const t of attackerTroops) {
    attackerCount += t.count;
  }

  let defenderCount = 0;
  for (const t of defenderTroops) {
    defenderCount += t.count;
  }

  const attackerKills = defenderCount > 0 ? Math.min(attackerCount, Math.floor(totalDefenderDamage / TROOP_STATS.attacker[1].health)) : 0;
  const defenderKills = attackerCount > 0 ? Math.min(defenderCount, Math.floor(totalAttackerDamage / TROOP_STATS.defender[1].health)) : defenderCount;

  const attackersRemaining = Math.max(0, attackerCount - attackerKills);
  const defendersRemaining = Math.max(0, defenderCount - defenderKills);

  const updates = [];
  const troopDeletes = [];

  if (attackersRemaining > 0 && defendersRemaining === 0) {
    let totalLoot = { gold: 0, wood: 0, stone: 0, meat: 0 };
    
    const attackerSorted = [...attackerTroops].sort((a, b) => a.level - b.level);
    let remainingAttackers = attackerCount - attackerKills;
    
    for (const t of attackerSorted) {
      const countToLoot = Math.min(t.count, remainingAttackers);
      const lootPerUnit = LOOT_PER_LEVEL[t.level];
      totalLoot.gold += lootPerUnit.gold * countToLoot;
      totalLoot.wood += lootPerUnit.wood * countToLoot;
      totalLoot.stone += lootPerUnit.stone * countToLoot;
      totalLoot.meat += lootPerUnit.meat * countToLoot;
      remainingAttackers -= countToLoot;
      if (remainingAttackers <= 0) break;
    }

    const actualLoot = {
      gold: Math.min(totalLoot.gold, targetUser.gold),
      wood: Math.min(totalLoot.wood, targetUser.wood),
      stone: Math.min(totalLoot.stone, targetUser.stone),
      meat: Math.min(totalLoot.meat, targetUser.meat),
    };

    updates.push({
      id: attackerUser.id,
      gold: attackerUser.gold + actualLoot.gold,
      wood: attackerUser.wood + actualLoot.wood,
      stone: attackerUser.stone + actualLoot.stone,
      meat: attackerUser.meat + actualLoot.meat
    });

    updates.push({
      id: targetUser.id,
      gold: Math.max(0, targetUser.gold - actualLoot.gold),
      wood: Math.max(0, targetUser.wood - actualLoot.wood),
      stone: Math.max(0, targetUser.stone - actualLoot.stone),
      meat: Math.max(0, targetUser.meat - actualLoot.meat),
      shield_until: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    });
  } else {
    updates.push({
      id: targetUser.id,
      shield_until: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    });
  }

  if (attackerKills > 0) {
    const attackerSorted = [...attackerTroops].sort((a, b) => a.level - b.level);
    let remainingKills = attackerKills;
    
    for (const t of attackerSorted) {
      if (remainingKills <= 0) break;
      const toDelete = Math.min(t.count, remainingKills);
      troopDeletes.push({ userId: attackerUser.id, troopType: 'attacker', level: t.level, count: toDelete });
      remainingKills -= toDelete;
    }
  }

  if (defenderKills > 0 && defenderCount > 0) {
    const defenderSorted = [...defenderTroops].sort((a, b) => a.level - b.level);
    let remainingKills = defenderKills;
    
    for (const t of defenderSorted) {
      if (remainingKills <= 0) break;
      const toDelete = Math.min(t.count, remainingKills);
      troopDeletes.push({ userId: targetUser.id, troopType: 'defender', level: t.level, count: toDelete });
      remainingKills -= toDelete;
    }
  }

  if (updates.length > 0) {
    for (const u of updates) {
      const { shield_until, ...resourceUpdates } = u;
      const updateObj = { ...resourceUpdates };
      if (shield_until) updateObj.shield_until = shield_until;
      
      await supabase.from('users').update(updateObj).eq('id', u.id);
    }
  }

  for (const td of troopDeletes) {
    const { data: existing } = await supabase
      .from('user_troops')
      .select('count')
      .eq('user_id', td.userId)
      .eq('troop_type', td.troopType)
      .eq('level', td.level)
      .single();

    if (existing) {
      const newCount = existing.count - td.count;
      if (newCount <= 0) {
        await supabase.from('user_troops').delete()
          .eq('user_id', td.userId)
          .eq('troop_type', td.troopType)
          .eq('level', td.level);
      } else {
        await supabase.from('user_troops').update({ count: newCount })
          .eq('user_id', td.userId)
          .eq('troop_type', td.troopType)
          .eq('level', td.level);
      }
    }
  }

  const finalLoot = defendersRemaining === 0 ? LOOT_PER_LEVEL[1] : { gold: 0, wood: 0, stone: 0, meat: 0 };

  return {
    attackerTroopsCount: attackerCount,
    defenderTroopsCount: defenderCount,
    attackersKilled: attackerKills,
    defendersKilled: defenderKills,
    attackersRemaining,
    defendersRemaining,
    loot: finalLoot,
    won: defendersRemaining === 0
  };
}