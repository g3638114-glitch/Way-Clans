import express from 'express';
import { sellResources, exchangeGold, addGold } from '../services/resourceService.js';
import { validateUserId, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/user/:userId/sell
router.post('/:userId/sell', validateUserId, requireAuth, async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const { wood, stone, meat } = req.body;
    const result = await sellResources(userId, { wood, stone, meat });
    res.json(result);
  } catch (error) {
    // Log treasury/storage full as info, not error
    if (error.message && error.message.includes('is full')) {
      console.info('ℹ️ Resource limit reached:', error.message);
    } else {
      console.error('Error selling resources:', error);
    }
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/exchange
router.post('/:userId/exchange', validateUserId, requireAuth, async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const { goldAmount } = req.body;
    const result = await exchangeGold(userId, goldAmount);
    res.json(result);
  } catch (error) {
    console.error('Error exchanging gold:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/coin-click
router.post('/:userId/coin-click', validateUserId, requireAuth, async (req, res) => {
  try {
    const userId = req.authenticatedUserId;
    const result = await addGold(userId, 100);
    res.json(result);
  } catch (error) {
    // Log treasury/storage full as info, not error
    if (error.message && error.message.includes('is full')) {
      console.info('ℹ️ Resource limit reached:', error.message);
    } else {
      console.error('Error adding gold:', error);
    }
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
