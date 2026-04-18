import { supabase } from '../bot.js';
import { getTreasuryCapacity } from '../config/buildings.js';
import { getOrCreateUser } from './userService.js';

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

  const user = await getOrCreateUser(userId);

  // Check if user has enough resources
  if ((wood || 0) > user.wood || (stone || 0) > user.stone || (meat || 0) > user.meat) {
    throw new Error('Not enough resources');
  }

  // Check treasury capacity
  const treasuryLevel = user.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);
  const newGoldAmount = (user.gold || 0) + goldEarned;

  if (newGoldAmount > capacity) {
    throw new Error(`Лимит казны достигнут. Продажа невозможна: вы получите ${goldEarned} Jamcoin, а в казне уже ${user.gold || 0} из ${capacity}. Освободите место и попробуйте снова.`);
  }

  // Update user resources
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      wood: user.wood - (wood || 0),
      stone: user.stone - (stone || 0),
      meat: user.meat - (meat || 0),
      gold: newGoldAmount,
    })
    .eq('telegram_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to update resources');
  }

  return { success: true, user: updatedUser };
}

export async function exchangeGold(userId, goldAmount) {
  if (goldAmount < EXCHANGE_CONFIG.MIN_EXCHANGE) {
    throw new Error(`Minimum exchange is ${EXCHANGE_CONFIG.MIN_EXCHANGE} Jamcoin`);
  }

  const user = await getOrCreateUser(userId);

  if (user.gold < goldAmount) {
    throw new Error('Not enough Jamcoin');
  }

  const jabcoinsGained = Math.floor(goldAmount / EXCHANGE_CONFIG.EXCHANGE_RATE);

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      gold: user.gold - goldAmount,
      jabcoins: user.jabcoins + jabcoinsGained,
    })
    .eq('telegram_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to exchange Jamcoin');
  }

  return { success: true, user: updatedUser, jabcoinsGained };
}

export async function addGold(userId, goldAmount) {
  const user = await getOrCreateUser(userId);

  // Check treasury capacity
  const treasuryLevel = user.treasury_level || 1;
  const capacity = getTreasuryCapacity(treasuryLevel);
  const newGoldAmount = (user.gold || 0) + goldAmount;

  if (newGoldAmount > capacity) {
    throw new Error(`Лимит казны достигнут. Вы не можете получить ещё ${goldAmount} Jamcoin. Вместимость казны: ${capacity}, сейчас: ${user.gold || 0}. Обменяйте или потратьте Jamcoin и попробуйте снова.`);
  }

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      gold: newGoldAmount,
      jamcoins_from_clicks: (user.jamcoins_from_clicks || 0) + goldAmount,
    })
    .eq('telegram_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to add Jamcoin');
  }

  return { success: true, user: updatedUser };
}
