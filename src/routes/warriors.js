import express from 'express';
import { upgradeWarrior, hireWarrior } from '../services/warriorService.js';

const router = express.Router();

// POST /api/user/:userId/warrior/:warriorId/upgrade
router.post('/:userId/warrior/:warriorId/upgrade', async (req, res) => {
  try {
    const { userId, warriorId } = req.params;
    const result = await upgradeWarrior(userId, warriorId);
    res.json(result);
  } catch (error) {
    console.error('Error upgrading warrior:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/warrior/:warriorId/hire
router.post('/:userId/warrior/:warriorId/hire', async (req, res) => {
  try {
    const { userId, warriorId } = req.params;
    const result = await hireWarrior(userId, warriorId);
    res.json(result);
  } catch (error) {
    console.error('Error hiring warrior:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
