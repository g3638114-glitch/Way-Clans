import express from 'express';
import { getQuests, claimQuestReward } from '../services/questService.js';

const router = express.Router();

// GET /api/user/:userId/quests
router.get('/:userId/quests', async (req, res) => {
  try {
    const { userId } = req.params;
    const quests = await getQuests(userId);
    res.json(quests);
  } catch (error) {
    console.error('Error fetching quests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/user/:userId/quest/:questId/claim
router.post('/:userId/quest/:questId/claim', async (req, res) => {
  try {
    const { userId, questId } = req.params;
    const result = await claimQuestReward(userId, questId);
    res.json(result);
  } catch (error) {
    console.error('Error claiming quest reward:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
