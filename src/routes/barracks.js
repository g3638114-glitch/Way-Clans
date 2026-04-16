import express from 'express';
import { getUserTroops, hireTroop, upgradeTroopType } from '../services/troopService.js';

const router = express.Router();

router.get('/:userId/troops', async (req, res) => {
  try {
    const result = await getUserTroops(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:userId/troops/hire', async (req, res) => {
  try {
    const result = await hireTroop(req.params.userId, req.body.type, req.body.quantity || 1);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:userId/troops/upgrade', async (req, res) => {
  try {
    const result = await upgradeTroopType(req.params.userId, req.body.type);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
