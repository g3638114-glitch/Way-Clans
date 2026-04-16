import express from 'express';
import { getRandomTarget, performAttack } from '../services/attackService.js';

const router = express.Router();

router.get('/:userId/attack/target', async (req, res) => {
  try {
    const result = await getRandomTarget(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:userId/attack', async (req, res) => {
  try {
    const { targetId } = req.body;
    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }
    const result = await performAttack(req.params.userId, targetId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;