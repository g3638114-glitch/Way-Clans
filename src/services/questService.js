import { supabase, bot } from '../bot.js';
import { getProductionRate } from '../config/buildings.js';

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

const QUEST_DEFINITIONS = [
  {
    id: 'subscribe_channel',
    title: 'Подписать на канал',
    description: 'Подпишитесь на наш канал в Telegram',
    reward: 'Шахта +1',
    icon: '📱',
    url: 'https://t.me/spn_newsvpn',
    rewardMines: 1,
  },
  {
    id: 'referral_1',
    title: '1 реферал',
    description: 'Пригласите друга',
    reward: 'Шахта +1',
    icon: '👥',
    rewardMines: 1,
    threshold: 1,
  },
  {
    id: 'referral_2',
    title: '2 реферала',
    description: 'Пригласите друзей',
    reward: 'Шахта +1',
    icon: '👥👥',
    rewardMines: 1,
    threshold: 2,
  },
  {
    id: 'referral_3',
    title: '3 реферала',
    description: 'Пригласите друзей',
    reward: 'Шахта +2',
    icon: '👥👥👥',
    rewardMines: 2,
    threshold: 3,
  },
];

async function isUserSubscribed(userId) {
  try {
    const CHANNEL_ID = '@spn_newsvpn';
    const member = await bot.telegram.getChatMember(CHANNEL_ID, userId);
    const status = member.status;
    return status === 'member' || status === 'creator' || status === 'administrator' || status === 'restricted';
  } catch (error) {
    console.log(`Subscription check error for user ${userId}:`, error.message);
    return false;
  }
}

export async function getQuests(userId) {
  // Get user (creates if doesn't exist)
  const user = await getOrCreateUser(userId);

  // Get referral count
  const referralCount = user.referral_count || 0;

  // Check if user is subscribed to channel
  const isSubscribed = await isUserSubscribed(userId);

  // Get completed quests
  let completedQuestIds = new Set();
  if (user && user.id) {
    const { data: completedQuestsList } = await supabase
      .from('completed_quests')
      .select('quest_id')
      .eq('user_id', user.id);
    completedQuestIds = new Set(completedQuestsList?.map(q => q.quest_id) || []);
  }

  // Build quests list
  const quests = QUEST_DEFINITIONS.map(questDef => {
    let completed = false;

    if (questDef.id === 'subscribe_channel') {
      completed = isSubscribed;
    } else if (questDef.id.startsWith('referral_')) {
      completed = referralCount >= questDef.threshold;
    }

    return {
      id: questDef.id,
      title: questDef.title,
      description: questDef.id.startsWith('referral_')
        ? `${questDef.description} (${referralCount}/${questDef.threshold})`
        : questDef.description,
      reward: questDef.reward,
      icon: questDef.icon,
      url: questDef.url,
      completed,
      rewarded: completedQuestIds.has(questDef.id),
    };
  });

  return quests;
}

export async function claimQuestReward(userId, questId) {
  // Get user (creates if doesn't exist)
  const user = await getOrCreateUser(userId);

  // Find quest definition
  const questDef = QUEST_DEFINITIONS.find(q => q.id === questId);
  if (!questDef) {
    throw new Error('Invalid quest');
  }

  // Check if quest is already completed
  const { data: existingCompletion } = await supabase
    .from('completed_quests')
    .select('id')
    .eq('user_id', user.id)
    .eq('quest_id', questId)
    .single();

  if (existingCompletion) {
    throw new Error('You have already received the reward for this quest!');
  }

  // Add mines to user
  const minesToAdd = questDef.rewardMines;
  const buildingsAdded = [];

  for (let i = 0; i < minesToAdd; i++) {
    // Get current max building number
    const { data: maxBuilding } = await supabase
      .from('user_buildings')
      .select('building_number')
      .eq('user_id', user.id)
      .eq('building_type', 'mine')
      .order('building_number', { ascending: false })
      .limit(1);

    const nextBuildingNumber = (maxBuilding && maxBuilding.length > 0)
      ? maxBuilding[0].building_number + 1
      : 1;

    // Get correct production rate for level 1
    const productionRate = getProductionRate('mine', 1);

    const { data: newBuilding, error: createError } = await supabase
      .from('user_buildings')
      .insert({
        user_id: user.id,
        building_type: 'mine',
        building_number: nextBuildingNumber,
        level: 1,
        collected_amount: 0,
        production_rate: productionRate,
        last_activated: null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!createError) {
      buildingsAdded.push(newBuilding);
    }
  }

  // Mark quest as completed
  await supabase
    .from('completed_quests')
    .insert({
      user_id: user.id,
      quest_id: questId,
      completed_at: new Date().toISOString(),
    });

  return {
    success: true,
    questId,
    minesAdded: minesToAdd,
    buildings: buildingsAdded,
    message: `✅ Received ${minesToAdd} mines!`,
  };
}
