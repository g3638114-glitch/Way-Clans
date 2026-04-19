import express from 'express';
import {
  upgradeBuilding,
  activateBuilding,
  getUserBuildings,
} from '../services/buildingService.js';
import { createBuildingCollectSession, finalizeBuildingCollectSession } from '../services/adService.js';

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

router.post('/:userId/building/:buildingId/collect/start', async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await createBuildingCollectSession(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error starting collect session:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/collect/finalize', async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req.body || {};
    const result = await finalizeBuildingCollectSession(userId, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error finalizing collect session:', error);
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
