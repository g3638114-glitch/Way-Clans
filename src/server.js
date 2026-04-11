import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { bot, supabase } from './bot.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Webhook for Telegram
app.post('/webhook', express.json(), (req, res) => {
  console.log('📨 Webhook received:', {
    update_id: req.body?.update_id,
    message: req.body?.message?.text,
    command: req.body?.message?.entities,
  });

  try {
    bot.handleUpdate(req.body).catch(err => {
      console.error('Update handling error:', err);
    });
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

// API endpoint to get user data
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to get user buildings
app.get('/api/user/:userId/buildings', async (req, res) => {
  try {
    const { userId } = req.params;

    // First get user by telegram_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all buildings for this user
    const { data: buildings, error } = await supabase
      .from('user_buildings')
      .select('*')
      .eq('user_id', user.id)
      .order('building_type')
      .order('building_number');

    if (error) {
      console.error('Error fetching buildings:', error);
      return res.status(500).json({ error: 'Failed to fetch buildings' });
    }

    // Fix buildings with missing or invalid last_collected
    const fixedBuildings = buildings || [];
    const now = new Date().toISOString();

    let needsUpdate = false;
    for (const building of fixedBuildings) {
      if (!building.last_collected || building.last_collected === null) {
        building.last_collected = now;
        building.collected_amount = 0;
        needsUpdate = true;
      }
    }

    // Update database if any buildings need fixing
    if (needsUpdate) {
      for (const building of fixedBuildings) {
        if (!building.last_collected || building.last_collected === null) {
          await supabase
            .from('user_buildings')
            .update({
              last_collected: now,
              collected_amount: 0,
            })
            .eq('id', building.id);
        }
      }
    }

    res.json(fixedBuildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to collect resources from building
app.post('/api/user/:userId/building/:buildingId/collect', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get building
    const { data: building, error: buildError } = await supabase
      .from('user_buildings')
      .select('*')
      .eq('id', buildingId)
      .eq('user_id', user.id)
      .single();

    if (buildError) {
      return res.status(404).json({ error: 'Building not found' });
    }

    // Calculate collected amount
    const collectedAmount = building.collected_amount || 0;

    if (collectedAmount <= 0) {
      return res.status(400).json({ error: 'Nothing to collect' });
    }

    // Update building
    const { data: updatedBuilding, error: updateError } = await supabase
      .from('user_buildings')
      .update({
        collected_amount: 0,
        last_collected: new Date().toISOString(),
      })
      .eq('id', buildingId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to collect' });
    }

    // Add resources to user
    const resourceType = building.building_type;
    let updateData = {};

    if (resourceType === 'mine') {
      updateData.gold = user.gold + collectedAmount;
    } else if (resourceType === 'quarry') {
      updateData.stone = user.stone + collectedAmount;
    } else if (resourceType === 'lumber_mill') {
      updateData.wood = user.wood + collectedAmount;
    } else if (resourceType === 'farm') {
      updateData.meat = user.meat + collectedAmount;
    }

    const { data: updatedUser, error: userUpdateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (userUpdateError) {
      return res.status(500).json({ error: 'Failed to update resources' });
    }

    res.json({ success: true, collected: collectedAmount, user: updatedUser, building: updatedBuilding });
  } catch (error) {
    console.error('Error collecting resources:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to upgrade building
app.post('/api/user/:userId/building/:buildingId/upgrade', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get building
    const { data: building, error: buildError } = await supabase
      .from('user_buildings')
      .select('*')
      .eq('id', buildingId)
      .eq('user_id', user.id)
      .single();

    if (buildError) {
      return res.status(404).json({ error: 'Building not found' });
    }

    // Calculate upgrade cost
    const level = building.level || 1;
    const upgradeCost = calculateUpgradeCost(level);

    if (user.gold < upgradeCost) {
      return res.status(400).json({ error: 'Not enough gold' });
    }

    // Update building
    const newProductionRate = building.production_rate * 1.2;

    const { data: updatedBuilding, error: updateError } = await supabase
      .from('user_buildings')
      .update({
        level: level + 1,
        production_rate: Math.floor(newProductionRate),
      })
      .eq('id', buildingId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to upgrade' });
    }

    // Deduct gold from user
    const { data: updatedUser, error: userUpdateError } = await supabase
      .from('users')
      .update({ gold: user.gold - upgradeCost })
      .eq('id', user.id)
      .select()
      .single();

    if (userUpdateError) {
      return res.status(500).json({ error: 'Failed to update gold' });
    }

    res.json({ success: true, costDeducted: upgradeCost, user: updatedUser, building: updatedBuilding });
  } catch (error) {
    console.error('Error upgrading building:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to calculate upgrade cost
function calculateUpgradeCost(level) {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

// API endpoint to update resources (sell items)
app.post('/api/user/:userId/sell', async (req, res) => {
  try {
    const { userId } = req.params;
    const { wood, stone, meat } = req.body;

    // Calculate gold from sold resources
    const goldEarned = (wood || 0) * 10 + (stone || 0) * 15 + (meat || 0) * 25;

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has enough resources
    if ((wood || 0) > user.wood || (stone || 0) > user.stone || (meat || 0) > user.meat) {
      return res.status(400).json({ error: 'Not enough resources' });
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
      return res.status(500).json({ error: 'Failed to update resources' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error selling resources:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint for exchange (gold to jabcoins)
app.post('/api/user/:userId/exchange', async (req, res) => {
  try {
    const { userId } = req.params;
    const { goldAmount } = req.body;

    const MIN_EXCHANGE = 1000000;
    const EXCHANGE_RATE = 1000000; // 1000000 gold = 1 jabcoin

    if (goldAmount < MIN_EXCHANGE) {
      return res.status(400).json({ error: `Minimum exchange is ${MIN_EXCHANGE} gold` });
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.gold < goldAmount) {
      return res.status(400).json({ error: 'Not enough gold' });
    }

    const jabcoinsGained = Math.floor(goldAmount / EXCHANGE_RATE);

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
      return res.status(500).json({ error: 'Failed to exchange' });
    }

    res.json({ success: true, user: updatedUser, jabcoinsGained });
  } catch (error) {
    console.error('Error exchanging gold:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to purchase a building
app.post('/api/user/:userId/building/purchase', async (req, res) => {
  try {
    const { userId } = req.params;
    const { buildingType } = req.body;

    // Define building properties - all initial buildings are FREE (cost: 0)
    // Production rate is per hour
    const buildingConfigs = {
      mine: { productionRate: 80, cost: 0 },          // 80 gold per hour
      quarry: { productionRate: 60, cost: 0 },        // 60 stone per hour
      lumber_mill: { productionRate: 50, cost: 0 },   // 50 wood per hour
      farm: { productionRate: 40, cost: 0 },          // 40 meat per hour
    };

    if (!buildingConfigs[buildingType]) {
      return res.status(400).json({ error: 'Invalid building type' });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's buildings of this type to determine building number
    const { data: userBuildings, error: buildError } = await supabase
      .from('user_buildings')
      .select('*')
      .eq('user_id', user.id)
      .eq('building_type', buildingType)
      .order('building_number', { ascending: false });

    if (buildError && buildError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to check existing buildings' });
    }

    // Only allow the first building of each type to be purchased
    if (userBuildings && userBuildings.length > 0) {
      return res.status(400).json({ error: 'You already own this building. Get more from quests!' });
    }

    const config = buildingConfigs[buildingType];
    const buildingNumber = 1;
    const cost = config.cost; // All initial buildings are free (0)

    // Check if user has enough gold (should always pass for free buildings, but good to check)
    if (user.gold < cost) {
      return res.status(400).json({ error: `Not enough gold. Need ${cost}, have ${user.gold}` });
    }

    // Create new building
    const { data: newBuilding, error: createError } = await supabase
      .from('user_buildings')
      .insert({
        user_id: user.id,
        building_type: buildingType,
        building_number: buildingNumber,
        level: 1,
        collected_amount: 0,
        production_rate: config.productionRate,
        last_collected: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      return res.status(500).json({ error: 'Failed to create building' });
    }

    // Deduct gold from user (0 for free buildings)
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ gold: user.gold - cost })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update user gold' });
    }

    res.json({
      success: true,
      costDeducted: cost,
      user: updatedUser,
      building: newBuilding,
    });
  } catch (error) {
    console.error('Error purchasing building:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to check channel subscription
app.post('/api/user/:userId/check-subscription', async (req, res) => {
  try {
    const { userId } = req.params;
    const CHANNEL_ID = '@spn_newsvpn'; // Channel to check subscription

    // Use Telegram Bot API to check if user is subscribed
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        user_id: userId,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result.description);
      return res.status(400).json({
        subscribed: false,
        error: 'Could not check subscription'
      });
    }

    const member = result.result;
    const isSubscribed = member.status === 'member' || member.status === 'administrator' || member.status === 'creator';

    res.json({ subscribed: isSubscribed });
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to get user quests
app.get('/api/user/:userId/quests', async (req, res) => {
  try {
    const { userId } = req.params;
    const CHANNEL_ID = '@spn_newsvpn';

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    // Get referral count (0 if user not found or field doesn't exist)
    let referralCount = 0;
    if (!userError && user) {
      referralCount = user.referral_count || 0;
    } else if (userError && userError.code !== 'PGRST116') {
      // If it's a different error (not "no rows"), log it
      console.error('Error fetching user for quests:', userError);
    }
    // If PGRST116 (no rows), just continue with referralCount = 0

    // Check channel subscription via Telegram API
    let isSubscribed = false;
    try {
      const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember`;
      const subResponse = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: CHANNEL_ID,
          user_id: userId,
        }),
      });

      const subResult = await subResponse.json();
      if (subResult.ok) {
        const member = subResult.result;
        isSubscribed = member.status === 'member' || member.status === 'administrator' || member.status === 'creator';
      }
    } catch (error) {
      console.error('Error checking subscription in quests:', error);
      // If error, just return false for subscription
    }

    // Define quests - always return them even if user not found
    const quests = [
      {
        id: 'subscribe_channel',
        title: 'Подписать на канал',
        description: 'Подпишитесь на наш канал в Telegram',
        reward: 'Шахта +1',
        icon: '📱',
        url: 'https://t.me/spn_newsvpn',
        completed: isSubscribed,
      },
      {
        id: 'referral_1',
        title: '1 реферал',
        description: `Пригласите друга (${referralCount}/1)`,
        reward: 'Шахта +1',
        icon: '👥',
        completed: referralCount >= 1,
      },
      {
        id: 'referral_2',
        title: '2 реферала',
        description: `Пригласите друзей (${referralCount}/2)`,
        reward: 'Шахта +1',
        icon: '👥👥',
        completed: referralCount >= 2,
      },
      {
        id: 'referral_3',
        title: '3 реферала',
        description: `Пригласите друзей (${referralCount}/3)`,
        reward: 'Шахта +2',
        icon: '👥👥👥',
        completed: referralCount >= 3,
      },
    ];

    res.json(quests);
  } catch (error) {
    console.error('Error fetching quests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to complete a quest and claim reward
app.post('/api/user/:userId/quest/:questId/claim', async (req, res) => {
  try {
    const { userId, questId } = req.params;

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Define quest rewards (mines)
    const questRewards = {
      subscribe_channel: 1,
      referral_1: 1,
      referral_2: 1,
      referral_3: 2,
    };

    const minesToAdd = questRewards[questId];

    if (!minesToAdd) {
      return res.status(400).json({ error: 'Invalid quest' });
    }

    // Add mines to user
    let buildingsAdded = [];
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

      const { data: newBuilding, error: createError } = await supabase
        .from('user_buildings')
        .insert({
          user_id: user.id,
          building_type: 'mine',
          building_number: nextBuildingNumber,
          level: 1,
          collected_amount: 0,
          production_rate: 80,
          last_collected: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!createError) {
        buildingsAdded.push(newBuilding);
      }
    }

    res.json({
      success: true,
      questId,
      minesAdded: minesToAdd,
      buildings: buildingsAdded,
      message: `✅ Получено ${minesToAdd} шахт!`,
    });
  } catch (error) {
    console.error('Error claiming quest reward:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve MiniApp HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

export { app };
export default app;
