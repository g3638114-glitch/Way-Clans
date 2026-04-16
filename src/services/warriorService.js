import { supabase } from '../bot.js';
import { WARRIOR_TYPES, HIRE_COSTS, ATTACKER_STATS, DEFENDER_STATS, getWarriorStats, getMaxLevel } from '../config/warriors.js';
import { getTreasuryCapacity, getWarehouseCapacity } from '../config/buildings.js';

async function getUser(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('telegram_id', userId).single();
  if (error) throw new Error('User not found');
  return data;
}

export async function getBarracksData(userId) {
  const user = await getUser(userId);
  const { data: warriors } = await supabase.from('user_warriors').select('*').eq('user_id', user.id);
  
  return {
    user,
    warriors: warriors || []
  };
}

export async function hireWarriors(userId, type, quantity) {
  const user = await getUser(userId);
  const level = type === WARRIOR_TYPES.ATTACKER ? user.attacker_level : user.defender_level;
  const costBase = HIRE_COSTS[type];
  
  const totalCost = {
    gold: costBase.gold * quantity,
    wood: costBase.wood * quantity,
    stone: costBase.stone * quantity,
    meat: costBase.meat * quantity
  };

  if (user.gold < totalCost.gold || user.wood < totalCost.wood || user.stone < totalCost.stone || user.meat < totalCost.meat) {
    throw new Error('Недостаточно ресурсов для найма');
  }

  // Списываем ресурсы
  await supabase.from('users').update({
    gold: user.gold - totalCost.gold,
    wood: user.wood - totalCost.wood,
    stone: user.stone - totalCost.stone,
    meat: user.meat - totalCost.meat
  }).eq('id', user.id);

  // Добавляем воинов (idempotent upsert)
  const { data: existing } = await supabase.from('user_warriors')
    .select('*').eq('user_id', user.id).eq('warrior_type', type).eq('level', level).single();

  if (existing) {
    await supabase.from('user_warriors').update({ quantity: parseInt(existing.quantity) + quantity }).eq('id', existing.id);
  } else {
    await supabase.from('user_warriors').insert({ user_id: user.id, warrior_type: type, level, quantity });
  }

  return getBarracksData(userId);
}

export async function upgradeWarriorType(userId, type) {
  const user = await getUser(userId);
  const currentLevel = type === WARRIOR_TYPES.ATTACKER ? user.attacker_level : user.defender_level;
  const nextLevel = currentLevel + 1;
  
  const stats = getWarriorStats(type, nextLevel);
  if (!stats || !stats.upgrade) throw new Error('Максимальный уровень уже достигнут');

  const cost = stats.upgrade;
  if ((cost.gold && user.gold < cost.gold) || (cost.meat && user.meat < cost.meat) || (cost.jabcoins && user.jabcoins < cost.jabcoins)) {
    throw new Error('Недостаточно ресурсов для улучшения');
  }

  const updateData = {
    [type === WARRIOR_TYPES.ATTACKER ? 'attacker_level' : 'defender_level']: nextLevel,
    gold: user.gold - (cost.gold || 0),
    meat: user.meat - (cost.meat || 0),
    jabcoins: user.jabcoins - (cost.jabcoins || 0)
  };

  await supabase.from('users').update(updateData).eq('id', user.id);
  return getBarracksData(userId);
}

export async function collectArmyResources(userId) {
  const user = await getUser(userId);
  const { data: warriors } = await supabase.from('user_warriors').select('*').eq('user_id', user.id).eq('warrior_type', WARRIOR_TYPES.ATTACKER);
  
  if (!warriors || warriors.length === 0) throw new Error('У вас нет атакующих воинов для сбора ресурсов');

  const now = new Date();
  const lastCollected = new Date(user.army_last_collected || user.created_at);
  const hoursPassed = (now - lastCollected) / (1000 * 60 * 60);
  
  if (hoursPassed < 0.01) throw new Error('Слишком рано для сбора');

  let totalProd = { gold: 0, wood: 0, stone: 0, meat: 0 };
  
  warriors.forEach(w => {
    const stats = ATTACKER_STATS[w.level];
    if (stats && stats.prod) {
      const qty = parseInt(w.quantity);
      totalProd.gold += Math.floor(stats.prod.gold * qty * hoursPassed);
      totalProd.wood += Math.floor(stats.prod.wood * qty * hoursPassed);
      totalProd.stone += Math.floor(stats.prod.stone * qty * hoursPassed);
      totalProd.meat += Math.floor(stats.prod.meat * qty * hoursPassed);
    }
  });

  if (totalProd.gold === 0 && totalProd.wood === 0 && totalProd.stone === 0 && totalProd.meat === 0) {
    throw new Error('Воины еще не произвели достаточно ресурсов');
  }

  // Проверка вместимости
  const treasuryCap = getTreasuryCapacity(user.treasury_level || 1);
  const warehouseCap = getWarehouseCapacity(user.warehouse_level || 1);

  const newGold = Math.min(user.gold + totalProd.gold, treasuryCap);
  const newWood = Math.min(user.wood + totalProd.wood, warehouseCap);
  const newStone = Math.min(user.stone + totalProd.stone, warehouseCap);
  const newMeat = Math.min(user.meat + totalProd.meat, warehouseCap);

  await supabase.from('users').update({
    gold: newGold,
    wood: newWood,
    stone: newStone,
    meat: newMeat,
    army_last_collected: now.toISOString()
  }).eq('id', user.id);

  return { success: true, collected: totalProd, user: await getUser(userId) };
}