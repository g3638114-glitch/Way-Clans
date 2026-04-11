import express from 'express';
import {
  collectResourcesFromBuilding,
  upgradeBuilding,
  purchaseBuilding,
} from '../services/buildingService.js';

const router = express.Router();

// POST /api/user/:userId/building/:buildingId/collect
router.post('/:userId/building/:buildingId/collect', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await collectResourcesFromBuilding(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error collecting resources:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/building/:buildingId/upgrade
router.post('/:userId/building/:buildingId/upgrade', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await upgradeBuilding(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error upgrading building:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/building/purchase
router.post('/:userId/building/purchase', async (req, res) => {
  try {
    const { userId } = req.params;
    const { buildingType } = req.body;
    const result = await purchaseBuilding(userId, buildingType);
    res.json(result);
  } catch (error) {
    console.error('Error purchasing building:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
