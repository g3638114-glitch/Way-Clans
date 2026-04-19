import express from 'express';
import { sellResources, exchangeGold, addGold } from '../services/resourceService.js';
import { supabase } from '../bot.js';

const router = express.Router();

// POST /api/user/:userId/sell
router.post('/:userId/sell', async (req, res) => {
  try {
    const { userId } = req.params;
    const { wood, stone, meat } = req.body;
    const result = await sellResources(userId, { wood, stone, meat });
    res.json(result);
  } catch (error) {
    console.error('Error selling resources:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/exchange
router.post('/:userId/exchange', async (req, res) => {
  try {
    const { userId } = req.params;
    const { goldAmount } = req.body;
    const result = await exchangeGold(userId, goldAmount);
    res.json(result);
  } catch (error) {
    console.error('Error exchanging Jamcoin:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/coin-click
router.post('/:userId/coin-click', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestedCount = Number(req.body?.count || 1);
    const count = Number.isFinite(requestedCount) ? Math.max(1, Math.floor(requestedCount)) : 1;
    const result = await addGold(userId, 100 * count);
    res.json(result);
  } catch (error) {
    console.error('Error adding Jamcoin:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/mining-ad-threshold', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestedThreshold = Number(req.body?.threshold || 0);
    const threshold = Number.isFinite(requestedThreshold) ? Math.max(0, Math.floor(requestedThreshold)) : 0;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const nextThreshold = Math.max(Number(user.last_mining_ad_threshold || 0), threshold);
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ last_mining_ad_threshold: nextThreshold })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError || !updatedUser) {
      return res.status(400).json({ error: 'Failed to update mining ad threshold' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating mining ad threshold:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
