import express from 'express';
import {
  getUserTreasury,
  upgradeTreasury,
  isTreasuryFull,
  getTreasuryRemainingCapacity,
} from '../services/treasuryService.js';

const router = express.Router();

// GET /api/user/:userId/treasury
// Get user's current treasury data including level, limit, and upgrade cost
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
// Upgrade treasury to next level
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

// GET /api/user/:userId/treasury/is-full
// Check if treasury is full
router.get('/:userId/treasury/is-full', async (req, res) => {
  try {
    const { userId } = req.params;
    const isFull = await isTreasuryFull(userId);
    res.json({ success: true, isFull });
  } catch (error) {
    console.error('Error checking treasury capacity:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// GET /api/user/:userId/treasury/remaining-capacity
// Get remaining capacity in treasury
router.get('/:userId/treasury/remaining-capacity', async (req, res) => {
  try {
    const { userId } = req.params;
    const remaining = await getTreasuryRemainingCapacity(userId);
    res.json({ success: true, remaining });
  } catch (error) {
    console.error('Error getting treasury capacity:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
