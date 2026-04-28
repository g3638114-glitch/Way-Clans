import { supabase, bot } from '../bot.js';
import { getProductionRate } from '../config/buildings.js';
import { getOrCreateUser } from './userService.js';
import { withTransaction } from '../database/pg.js';

const QUEST_DEFINITIONS = [
  {
    id: 'subscribe_channel',
    title: 'Подписка на канал',
    description: 'Подпишитесь на наш канал в Telegram',
    reward: 'Шахта +1',
    icon: '📱',
    url: 'https://t.me/WayClansNews',
    chatId: '@WayClansNews',
    rewardMines: 1,
  },
  {
    id: 'subscribe_group',
    title: 'Подписка на группу',
    description: 'Вступите в нашу группу в Telegram',
    reward: 'Шахта +1',
    icon: '💬',
    url: 'https://t.me/WayClansChat',
    chatId: '@WayClansChat',
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

async function isUserSubscribedToChat(userId, chatId) {
  try {
    const member = await bot.telegram.getChatMember(chatId, userId);
    const status = member.status;
    return status === 'member' || status === 'creator' || status === 'administrator' || status === 'restricted';
  } catch (error) {
    console.log(`Subscription check error for user ${userId} in ${chatId}:`, error.message);
    return false;
  }
}

export async function getQuests(userId) {
  // Get user (creates if doesn't exist)
  const user = await getOrCreateUser(userId);

  // Get referral count
  const referralCount = user.referral_count || 0;

  const subscriptionResults = new Map();
  for (const questDef of QUEST_DEFINITIONS) {
    if (questDef.chatId) {
      subscriptionResults.set(questDef.id, await isUserSubscribedToChat(userId, questDef.chatId));
    }
  }

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

    if (questDef.chatId) {
      completed = Boolean(subscriptionResults.get(questDef.id));
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
  const user = await getOrCreateUser(userId);
  const questDef = QUEST_DEFINITIONS.find(q => q.id === questId);
  if (!questDef) {
    throw new Error('Invalid quest');
  }

  let completed = false;
  if (questDef.chatId) {
    completed = await isUserSubscribedToChat(userId, questDef.chatId);
  } else if (questDef.id.startsWith('referral_')) {
    completed = Number(user.referral_count || 0) >= Number(questDef.threshold || 0);
  }

  if (!completed) {
    throw new Error('Quest requirements are not met yet');
  }

  return withTransaction(async (client) => {
    const completionResult = await client.query(
      `INSERT INTO completed_quests (user_id, quest_id, completed_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, quest_id) DO NOTHING
       RETURNING id`,
      [user.id, questId, new Date().toISOString()]
    );

    if (completionResult.rows.length === 0) {
      throw new Error('You have already received the reward for this quest!');
    }

    const minesToAdd = Number(questDef.rewardMines || 0);
    const buildingsAdded = [];
    let nextBuildingNumber = 1;

    const maxBuildingResult = await client.query(
      `SELECT building_number
       FROM user_buildings
       WHERE user_id = $1 AND building_type = 'mine'
       ORDER BY building_number DESC
       LIMIT 1
       FOR UPDATE`,
      [user.id]
    );

    if (maxBuildingResult.rows.length > 0) {
      nextBuildingNumber = Number(maxBuildingResult.rows[0].building_number || 0) + 1;
    }

    const productionRate = getProductionRate('mine', 1);
    for (let index = 0; index < minesToAdd; index += 1) {
      const newBuildingResult = await client.query(
        `INSERT INTO user_buildings (
          user_id, building_type, building_number, level, collected_amount, production_rate, last_activated, created_at
        ) VALUES ($1, 'mine', $2, 1, 0, $3, NULL, $4)
        RETURNING *`,
        [user.id, nextBuildingNumber + index, productionRate, new Date().toISOString()]
      );
      buildingsAdded.push(newBuildingResult.rows[0]);
    }

    return {
      success: true,
      questId,
      minesAdded: minesToAdd,
      buildings: buildingsAdded,
      message: `✅ Received ${minesToAdd} mines!`,
    };
  });
}
