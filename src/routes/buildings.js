import express from 'express';
import {
  collectBuildingResources,
  collectResourcesFromBuilding,
  upgradeBuilding,
  activateBuilding,
  getUserBuildings,
  startMineWorkers,
  finishMineWorkNow,
  speedUpBuildingProduction,
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

router.post('/:userId/building/:buildingId/collect-x2', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await collectBuildingResources(userId, buildingId, 2);
    res.json(result);
  } catch (error) {
    console.error('Error collecting resources x2:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/speed-up', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await speedUpBuildingProduction(userId, buildingId, 2);
    res.json(result);
  } catch (error) {
    console.error('Error speeding up building production:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/mine/start', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const { mode } = req.body || {};
    const result = await startMineWorkers(userId, buildingId, mode);
    res.json(result);
  } catch (error) {
    console.error('Error starting mine workers:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/mine/finish-now', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const { rewardMultiplier } = req.body || {};
    const result = await finishMineWorkNow(userId, buildingId, rewardMultiplier);
    res.json(result);
  } catch (error) {
    console.error('Error finishing mine work now:', error);
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

export default router;
