import { supabase } from '../bot.js';

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
        warrior_levels: {},
        warrior_counts: {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating user:', insertError);
      throw new Error('Failed to create user');
    }

    console.log(`✅ User ${telegramId} created successfully (${firstName}/${username})`);

    return newUser;
  }

  // Some other error occurred
  throw new Error('User not found');
}

// Warrior configuration (must match frontend)
const WARRIORS = {
  defender: {
    id: 'defender',
    name: 'Защищающий',
    hireCost: {
      gold: 1000,
      wood: 500,
      stone: 500,
      meat: 100,
    },
    levels: [
      { level: 1, damage: 100, health: 200, upgradeCost: null },
      { level: 2, damage: 200, health: 400, upgradeCost: { gold: 10000, meat: 100 } },
      { level: 3, damage: 400, health: 800, upgradeCost: { gold: 100000, meat: 200 } },
      { level: 4, damage: 1200, health: 1600, upgradeCost: { gold: 500000, meat: 500 } },
      { level: 5, damage: 2400, health: 3200, upgradeCost: { gold: 1000000, meat: 1000 } },
      { level: 6, damage: 5000, health: 10000, upgradeCost: { jabcoin: 10, meat: 10000 } },
    ],
  },

  attacker: {
    id: 'attacker',
    name: 'Атакующий',
    hireCost: {
      gold: 250,
      wood: 65,
      stone: 65,
      meat: 10,
    },
    levels: [
      { level: 1, damage: 200, health: 200, upgradeCost: null, loot: { gold: 31, wood: 15, stone: 15, meat: 1 } },
      { level: 2, damage: 400, health: 400, upgradeCost: { gold: 20000, meat: 200 }, loot: { gold: 62, wood: 30, stone: 30, meat: 2 } },
      { level: 3, damage: 1600, health: 1600, upgradeCost: { gold: 200000, meat: 400 }, loot: { gold: 125, wood: 60, stone: 60, meat: 4 } },
      { level: 4, damage: 3200, health: 3200, upgradeCost: { gold: 1000000, meat: 1000 }, loot: { gold: 400, wood: 150, stone: 150, meat: 10 } },
      { level: 5, damage: 6400, health: 6400, upgradeCost: { jabcoin: 1, meat: 5000 }, loot: { gold: 800, wood: 300, stone: 300, meat: 20 } },
      { level: 6, damage: 20000, health: 20000, upgradeCost: { jabcoin: 10, gold: 0, meat: 10000 }, loot: { gold: 2000, wood: 500, stone: 500, meat: 30 } },
    ],
  },
};

/**
 * Get warrior config by ID
 */
function getWarrior(warriorId) {
  return WARRIORS[warriorId];
}

/**
 * Get specific level data for a warrior
 */
function getWarriorLevel(warriorId, level) {
  const warrior = getWarrior(warriorId);
  if (!warrior) return null;
  return warrior.levels.find(l => l.level === level) || null;
}

/**
 * Upgrade a warrior to the next level
 */
export async function upgradeWarrior(userId, warriorId) {
  try {
    const warrior = getWarrior(warriorId);
    if (!warrior) {
      throw new Error('Warrior not found');
    }

    // Get user data by telegram_id
    const user = await getOrCreateUser(userId);

    // Get current warrior level
    const currentLevel = user.warrior_levels?.[warriorId] || 0;
    const nextLevel = currentLevel + 1;

    // Check if already maxed
    if (nextLevel > warrior.levels.length) {
      throw new Error('Warrior is already at maximum level');
    }

    // Get upgrade cost
    const nextLevelData = getWarriorLevel(warriorId, nextLevel);
    if (!nextLevelData || !nextLevelData.upgradeCost) {
      throw new Error('Cannot upgrade warrior');
    }

    const cost = nextLevelData.upgradeCost;

    // Check resources
    if (cost.gold && user.gold < cost.gold) {
      throw new Error('Недостаточно Jamcoin');
    }
    if (cost.jabcoin && user.jabcoins < cost.jabcoin) {
      throw new Error('Недостаточно Jabcoins');
    }
    if (cost.meat && user.meat < cost.meat) {
      throw new Error('Недостаточно мяса');
    }

    // Deduct resources
    const newGold = cost.gold ? user.gold - cost.gold : user.gold;
    const newJabcoins = cost.jabcoin ? user.jabcoins - cost.jabcoin : user.jabcoins;
    const newMeat = cost.meat ? user.meat - cost.meat : user.meat;

    // Update warrior level
    const updatedWarriorLevels = { ...user.warrior_levels };
    updatedWarriorLevels[warriorId] = nextLevel;

    // Update user in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        gold: newGold,
        jabcoins: newJabcoins,
        meat: newMeat,
        warrior_levels: updatedWarriorLevels,
        updated_at: new Date(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update user');
    }

    return {
      success: true,
      message: `Warrior upgraded to level ${nextLevel}`,
      user: updatedUser,
    };
  } catch (error) {
    throw new Error(error.message || 'Failed to upgrade warrior');
  }
}

/**
 * Hire a warrior
 */
export async function hireWarrior(userId, warriorId) {
  try {
    const warrior = getWarrior(warriorId);
    if (!warrior) {
      throw new Error('Warrior not found');
    }

    const cost = warrior.hireCost;

    // Get user data by telegram_id
    const user = await getOrCreateUser(userId);

    // Check resources
    if (user.gold < cost.gold) {
      throw new Error(`Недостаточно Jamcoin (нужно ${cost.gold})`);
    }
    if (user.wood < cost.wood) {
      throw new Error(`Недостаточно дерева (нужно ${cost.wood})`);
    }
    if (user.stone < cost.stone) {
      throw new Error(`Недостаточно камня (нужно ${cost.stone})`);
    }
    if (user.meat < cost.meat) {
      throw new Error(`Недостаточно мяса (нужно ${cost.meat})`);
    }

    // Deduct resources
    const newGold = user.gold - cost.gold;
    const newWood = user.wood - cost.wood;
    const newStone = user.stone - cost.stone;
    const newMeat = user.meat - cost.meat;

    // Update warrior count
    const updatedWarriorCounts = { ...user.warrior_counts };
    updatedWarriorCounts[warriorId] = (updatedWarriorCounts[warriorId] || 0) + 1;

    // Set initial level if not set
    const updatedWarriorLevels = { ...user.warrior_levels };
    if (!updatedWarriorLevels[warriorId]) {
      updatedWarriorLevels[warriorId] = 1;
    }

    // Update user in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        gold: newGold,
        wood: newWood,
        stone: newStone,
        meat: newMeat,
        warrior_counts: updatedWarriorCounts,
        warrior_levels: updatedWarriorLevels,
        updated_at: new Date(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update user');
    }

    return {
      success: true,
      message: `${warrior.name} hired successfully`,
      user: updatedUser,
    };
  } catch (error) {
    throw new Error(error.message || 'Failed to hire warrior');
  }
}
