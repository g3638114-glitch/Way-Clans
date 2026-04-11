import { supabase } from '../bot.js';

const RESOURCE_PRICES = {
  wood: 10,
  stone: 15,
  meat: 25,
};

const EXCHANGE_CONFIG = {
  MIN_EXCHANGE: 1000000,
  EXCHANGE_RATE: 1000000, // 1000000 gold = 1 jabcoin
};

export async function sellResources(userId, { wood = 0, stone = 0, meat = 0 }) {
  // Calculate gold from sold resources
  const goldEarned = (wood || 0) * RESOURCE_PRICES.wood 
    + (stone || 0) * RESOURCE_PRICES.stone 
    + (meat || 0) * RESOURCE_PRICES.meat;

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (fetchError) {
    throw new Error('User not found');
  }

  // Check if user has enough resources
  if ((wood || 0) > user.wood || (stone || 0) > user.stone || (meat || 0) > user.meat) {
    throw new Error('Not enough resources');
  }

  // Update user resources
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      wood: user.wood - (wood || 0),
      stone: user.stone - (stone || 0),
      meat: user.meat - (meat || 0),
      gold: user.gold + goldEarned,
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
    throw new Error(`Minimum exchange is ${EXCHANGE_CONFIG.MIN_EXCHANGE} gold`);
  }

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', userId)
    .single();

  if (fetchError) {
    throw new Error('User not found');
  }

  if (user.gold < goldAmount) {
    throw new Error('Not enough gold');
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
    throw new Error('Failed to exchange gold');
  }

  return { success: true, user: updatedUser, jabcoinsGained };
}
