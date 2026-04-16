import express from 'express';
import { getBarracksData, hireWarriors, upgradeWarriorType, collectArmyResources } from '../services/warriorService.js';

const router = express.Router();

router.get('/:userId/barracks', async (req, res) => {
  try {
    const data = await getBarracksData(req.params.userId);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:userId/barracks/hire', async (req, res) => {
  try {
    const { type, quantity } = req.body;
    const data = await hireWarriors(req.params.userId, type, quantity);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:userId/barracks/upgrade', async (req, res) => {
  try {
    const { type } = req.body;
    const data = await upgradeWarriorType(req.params.userId, type);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:userId/barracks/collect', async (req, res) => {
  try {
    const data = await collectArmyResources(req.params.userId);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;