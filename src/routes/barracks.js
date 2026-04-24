import express from 'express';
import { getUserTroops, hireTroop, upgradeTroopType } from '../services/troopService.js';
import { requireTelegramAuth } from '../middleware/telegramAuth.js';

const router = express.Router();

router.get('/:userId/troops', requireTelegramAuth, async (req, res) => {
  try {
    const result = await getUserTroops(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:userId/troops/hire', requireTelegramAuth, async (req, res) => {
  try {
    const result = await hireTroop(req.params.userId, req.body.type, req.body.quantity || 1);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:userId/troops/upgrade', requireTelegramAuth, async (req, res) => {
  try {
    const result = await upgradeTroopType(req.params.userId, req.body.type);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
