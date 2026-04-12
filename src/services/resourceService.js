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

/**
 * Create initial buildings for a user (mine, quarry, lumber_mill, farm)
 */
async function createInitialBuildings(userRecord) {
  try {
    if (!userRecord || !userRecord.id) {
      console.error('Error: Invalid user record for initial buildings');
      return;
    }

    const buildingTypes = ['mine', 'quarry', 'lumber_mill', 'farm'];
    const productionRates = {
      mine: 100,
      quarry: 80,
      lumber_mill: 90,
      farm: 70,
    };

    const buildingsToCreate = buildingTypes.map((type) => ({
      user_id: userRecord.id,
      building_type: type,
      building_number: 1,
      level: 1,
      collected_amount: 0,
      production_rate: productionRates[type],
      last_activated: null,
      created_at: new Date().toISOString(),
    }));

    const { data: createdBuildings, error: createError } = await supabase
      .from('user_buildings')
      .insert(buildingsToCreate)
      .select();

    if (createError) {
      console.error('Error creating initial buildings:', createError);
      return;
    }

    console.log(`✅ Created ${createdBuildings.length} initial buildings for user ${userRecord.id}`);
  } catch (error) {
    console.error('Error creating initial buildings:', error);
  }
}

/**
 * Get a user by telegram_id, create if doesn't exist
 */
async function getOrCreateUser(telegramId, userInfo = null) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  // User exists - return it
  if (!error) {
    return user;
  }

  // User doesn't exist - create new
  if (error.code === 'PGRST116') {
    console.log(`📝 Creating new user ${telegramId}`);

    // Use provided Telegram user info or defaults
    const username = userInfo?.username || `user_${telegramId}`;
    const firstName = userInfo?.first_name || 'Player';

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        username: username,
        first_name: firstName,
        photo_url: null,
        gold: 5000,
        wood: 2500,
        stone: 2500,
        meat: 500,
        jabcoins: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating user:', insertError);
      throw new Error('Failed to create user');
    }

    console.log(`✅ User ${telegramId} created successfully (${firstName}/${username})`);

    // Create initial buildings for the user
    await createInitialBuildings(newUser);

    return newUser;
  }

  // Some other error occurred
  throw new Error('User not found');
}

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

  const user = await getOrCreateUser(userId);

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

export async function addGold(userId, goldAmount) {
  const user = await getOrCreateUser(userId);

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      gold: user.gold + goldAmount,
      jamcoins_from_clicks: (user.jamcoins_from_clicks || 0) + goldAmount,
    })
    .eq('telegram_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new Error('Failed to add gold');
  }

  return { success: true, user: updatedUser };
}
