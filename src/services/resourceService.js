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
 * Get a user by UUID or telegram_id, create if doesn't exist
 * Accepts either a UUID (internal user ID) or a telegram ID (numeric)
 * Uses database transactions to prevent race conditions
 */
async function getOrCreateUser(userIdentifier, userInfo = null) {
  try {
    // Use transactional version that handles concurrent creation and both UUID/telegram ID formats
    const user = await transactionGetOrCreateUser(userIdentifier, userInfo);

    if (!user) {
      throw new Error('Failed to get or create user');
    }

    console.log(`✅ User ready (${user.first_name}/${user.username})`);
    return user;
  } catch (error) {
    console.error('❌ Error in getOrCreateUser:', error.message);
    throw new Error('Failed to get or create user');
  }
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
