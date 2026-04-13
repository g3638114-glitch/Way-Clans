import express from 'express';
import { getUserTreasury, upgradeTreasury } from '../services/treasuryService.js';

const router = express.Router();

// GET /api/user/:userId/treasury
router.get('/:userId/treasury', async (req, res) => {
  try {
    const { userId } = req.params;
    const treasury = await getUserTreasury(userId);
    res.json({ success: true, treasury });
  } catch (error) {
    console.error('Error fetching treasury:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/treasury/upgrade
router.post('/:userId/treasury/upgrade', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await upgradeTreasury(userId);
    res.json(result);
  } catch (error) {
    console.error('Error upgrading treasury:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
