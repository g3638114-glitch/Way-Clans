import { supabase } from '../bot.js';
import { TROOP_STATS, HIRE_COSTS } from '../config/troops.js';

export async function getUserTroops(userId) {
  const { data: user } = await supabase.from('users').select('id, attacker_level, defender_level').eq('telegram_id', userId).single();
  const { data: troops } = await supabase.from('user_troops').select('*').eq('user_id', user.id);
  return { attacker_level: user.attacker_level, defender_level: user.defender_level, troops: troops || [] };
}

export async function hireTroop(userId, type) {
  const { data: user } = await supabase.from('users').select('*').eq('telegram_id', userId).single();
  const level = type === 'attacker' ? user.attacker_level : user.defender_level;
  const cost = HIRE_COSTS[type];

  if (user.gold < cost.gold || user.wood < cost.wood || user.stone < cost.stone || user.meat < cost.meat) {
    throw new Error('Недостаточно ресурсов для найма');
  }

  // Deduct resources
  await supabase.from('users').update({
    gold: user.gold - cost.gold,
    wood: user.wood - cost.wood,
    stone: user.stone - cost.stone,
    meat: user.meat - cost.meat
  }).eq('id', user.id);

  // Add troop
  const { data: existing } = await supabase.from('user_troops').select('*').eq('user_id', user.id).eq('troop_type', type).eq('level', level).single();

  if (existing) {
    await supabase.from('user_troops').update({ count: parseInt(existing.count) + 1 }).eq('id', existing.id);
  } else {
    await supabase.from('user_troops').insert({ user_id: user.id, troop_type: type, level, count: 1 });
  }

  const { data: updatedUser } = await supabase.from('users').select('*').eq('id', user.id).single();
  const { data: updatedTroops } = await supabase.from('user_troops').select('*').eq('user_id', user.id);

  return { user: updatedUser, troops: updatedTroops };
}

export async function upgradeTroopType(userId, type) {
  const { data: user } = await supabase.from('users').select('*').eq('telegram_id', userId).single();
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