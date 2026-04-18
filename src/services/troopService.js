import { supabase } from '../bot.js';
import { TROOP_STATS, HIRE_COSTS } from '../config/troops.js';
import { getUserByTelegramId } from './userService.js';

export async function getUserTroops(userId) {
  const user = await getUserByTelegramId(userId, 'id, attacker_level, defender_level');
  const { data: troops } = await supabase.from('user_troops').select('*').eq('user_id', user.id);
  return { attacker_level: user.attacker_level, defender_level: user.defender_level, troops: troops || [] };
}

export async function hireTroop(userId, type, quantity = 1) {
  const user = await getUserByTelegramId(userId);
  const level = type === 'attacker' ? user.attacker_level : user.defender_level;
  const cost = HIRE_COSTS[type];

  // Calculate total cost for all units
  const totalCost = {
    gold: cost.gold * quantity,
    wood: cost.wood * quantity,
    stone: cost.stone * quantity,
    meat: cost.meat * quantity
  };

  if (user.gold < totalCost.gold || user.wood < totalCost.wood || user.stone < totalCost.stone || user.meat < totalCost.meat) {
    throw new Error('Недостаточно ресурсов для найма');
  }

  // Deduct resources
  await supabase.from('users').update({
    gold: user.gold - totalCost.gold,
    wood: user.wood - totalCost.wood,
    stone: user.stone - totalCost.stone,
    meat: user.meat - totalCost.meat
  }).eq('id', user.id);

  // Add troops
  const { data: existing } = await supabase.from('user_troops').select('*').eq('user_id', user.id).eq('troop_type', type).eq('level', level).single();

  if (existing) {
    await supabase.from('user_troops').update({ count: parseInt(existing.count) + quantity }).eq('id', existing.id);
  } else {
    await supabase.from('user_troops').insert({ user_id: user.id, troop_type: type, level, count: quantity });
  }

  const { data: updatedUser } = await supabase.from('users').select('*').eq('id', user.id).single();
  const { data: updatedTroops } = await supabase.from('user_troops').select('*').eq('user_id', user.id);

  return { user: updatedUser, troops: updatedTroops };
}

export async function upgradeTroopType(userId, type) {
  const user = await getUserByTelegramId(userId);
  const currentLevel = type === 'attacker' ? user.attacker_level : user.defender_level;
  
  if (currentLevel >= 6) throw new Error('Максимальный уровень достигнут');
  
  const nextLevel = currentLevel + 1;
  const cost = TROOP_STATS[type][nextLevel].cost;

  if (cost.gold && user.gold < cost.gold) throw new Error('Недостаточно Jamcoin');
  if (cost.meat && user.meat < cost.meat) throw new Error('Недостаточно мяса');
  if (cost.jabcoins && user.jabcoins < cost.jabcoins) throw new Error('Недостаточно Jabcoin');

  // Deduct resources
  const updates = {
    [type === 'attacker' ? 'attacker_level' : 'defender_level']: nextLevel
  };
  if (cost.gold) updates.gold = user.gold - cost.gold;
  if (cost.meat) updates.meat = user.meat - cost.meat;
  if (cost.jabcoins) updates.jabcoins = user.jabcoins - cost.jabcoins;

  await supabase.from('users').update(updates).eq('id', user.id);

  const { data: updatedUser } = await supabase.from('users').select('*').eq('id', user.id).single();
  return { user: updatedUser };
}
