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

// Serve MiniApp HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

export { app };
export default app;
