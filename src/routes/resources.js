import express from 'express';
import { sellResources, exchangeGold, addGold } from '../services/resourceService.js';

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
    const result = await addGold(userId, 100);
    res.json(result);
  } catch (error) {
    console.error('Error adding Jamcoin:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
