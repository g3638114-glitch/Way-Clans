import express from 'express';
import {
  collectResourcesFromBuilding,
  upgradeBuilding,
  activateBuilding,
  getUserBuildings,
  upgradeTreasury,
  upgradeStorage,
} from '../services/buildingService.js';

const router = express.Router();

// GET /api/user/:userId/buildings
router.get('/:userId/buildings', async (req, res) => {
  try {
    const { userId } = req.params;
    const buildings = await getUserBuildings(userId);
    res.json({ success: true, buildings });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/building/:buildingId/activate
router.post('/:userId/building/:buildingId/activate', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await activateBuilding(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error activating building:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

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

// POST /api/user/:userId/storage/upgrade
router.post('/:userId/storage/upgrade', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await upgradeStorage(userId);
    res.json(result);
  } catch (error) {
    console.error('Error upgrading storage:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
