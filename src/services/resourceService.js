import { supabase } from '../bot.js';
import { getTreasuryCapacity } from '../config/buildings.js';
import { transactionSellResources, transactionExchangeGold, transactionAddGold, transactionGetOrCreateUser } from './transactionService.js';

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
  try {
    // Use transactional version to ensure atomicity
    const result = await transactionSellResources(userId, wood, stone, meat);
    return result;
  } catch (error) {
    console.error('Error selling resources:', error.message);
    throw error;
  }
}

export async function exchangeGold(userId, goldAmount) {
  try {
    // Use transactional version to ensure atomicity
    const result = await transactionExchangeGold(userId, goldAmount);
    return result;
  } catch (error) {
    console.error('Error exchanging gold:', error.message);
    throw error;
  }
}

export async function addGold(userId, goldAmount) {
  try {
    // Use transactional version to ensure atomicity
    const result = await transactionAddGold(userId, goldAmount);
    return result;
  } catch (error) {
    console.error('Error adding gold:', error.message);
    throw error;
  }
}
