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

// API endpoint to get user's buildings
app.get('/api/user/:userId/buildings', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user with their ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all buildings for this user
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', user.id)
      .order('building_type');

    // Get building configs
    const { data: configs } = await supabase
      .from('building_configs')
      .select('*');

    // Merge configs with buildings
    const buildingsWithConfigs = buildings?.map(b => ({
      ...b,
      building_configs: configs?.find(c => c.building_type === b.building_type)
    })) || [];

    if (buildingsError) {
      return res.status(500).json({ error: 'Failed to fetch buildings' });
    }

    res.json({ buildings: buildingsWithConfigs });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to collect resources from a building
app.post('/api/user/:userId/buildings/:buildingType/collect', async (req, res) => {
  try {
    const { userId, buildingType } = req.params;

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', user.id)
      .eq('building_type', buildingType)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    // Get building config
    const { data: config, error: configError } = await supabase
      .from('building_configs')
      .select('*')
      .eq('building_type', buildingType)
      .single();

    if (configError || !config) {
      return res.status(404).json({ error: 'Building config not found' });
    }

    // Calculate production based on time since last collection
    const now = new Date();
    const lastCollected = new Date(building.last_collected_at);
    const hoursPassed = (now - lastCollected) / (1000 * 60 * 60);

    const productionPerHour = config.base_production * building.level;
    const collectedAmount = Math.floor(productionPerHour * hoursPassed);

    if (collectedAmount === 0) {
      return res.status(400).json({ error: 'Nothing to collect yet' });
    }

    // Update user resources
    const updateObj = {
      [config.resource_type]: user[config.resource_type] + collectedAmount,
      updated_at: new Date().toISOString()
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateObj)
      .eq('telegram_id', userId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update resources' });
    }

    // Reset building collection
    const { error: buildingUpdateError } = await supabase
      .from('buildings')
      .update({
        collected_amount: 0,
        last_collected_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('building_type', buildingType);

    if (buildingUpdateError) {
      return res.status(500).json({ error: 'Failed to update building' });
    }

    res.json({
      success: true,
      user: updatedUser,
      resourceType: config.resource_type,
      collectedAmount
    });
  } catch (error) {
    console.error('Error collecting resources:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to upgrade a building
app.post('/api/user/:userId/buildings/:buildingType/upgrade', async (req, res) => {
  try {
    const { userId, buildingType } = req.params;

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('user_id', user.id)
      .eq('building_type', buildingType)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    // Get building config
    const { data: config, error: configError } = await supabase
      .from('building_configs')
      .select('*')
      .eq('building_type', buildingType)
      .single();

    if (configError || !config) {
      return res.status(404).json({ error: 'Building config not found' });
    }
    const nextLevel = building.level + 1;

    // Scale upgrade costs
    const costMultiplier = Math.pow(1.1, building.level - 1);
    const costGold = Math.floor((config.cost_gold || 0) * costMultiplier);
    const costStone = Math.floor((config.cost_stone || 0) * costMultiplier);
    const costWood = Math.floor((config.cost_wood || 0) * costMultiplier);
    const costMeat = Math.floor((config.cost_meat || 0) * costMultiplier);

    // Check if user has enough resources
    if (user.gold < costGold || user.stone < costStone || user.wood < costWood || user.meat < costMeat) {
      return res.status(400).json({ error: 'Not enough resources to upgrade' });
    }

    // Deduct resources and upgrade building
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        gold: user.gold - costGold,
        stone: user.stone - costStone,
        wood: user.wood - costWood,
        meat: user.meat - costMeat,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', userId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update user' });
    }

    // Update building level
    const { error: buildingUpdateError } = await supabase
      .from('buildings')
      .update({ level: nextLevel })
      .eq('user_id', user.id)
      .eq('building_type', buildingType);

    if (buildingUpdateError) {
      return res.status(500).json({ error: 'Failed to upgrade building' });
    }

    res.json({
      success: true,
      user: updatedUser,
      newLevel: nextLevel,
      costGold, costStone, costWood, costMeat
    });
  } catch (error) {
    console.error('Error upgrading building:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve MiniApp HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

export { app };
export default app;
