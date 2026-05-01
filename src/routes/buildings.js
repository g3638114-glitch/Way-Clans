import express from 'express';
import {
  collectBuildingResources,
  collectResourcesFromBuilding,
  upgradeBuilding,
  activateBuilding,
  getUserBuildings,
  startMineWorkers,
} from '../services/buildingService.js';
import { requireTelegramAuth } from '../middleware/telegramAuth.js';
import {
  createBuildingCollectSession,
  createMineAdWorkersSession,
  createMineFinishNowSession,
  createSpeedUpSession,
  finalizeBuildingCollectSession,
  finalizeMineAdWorkersSession,
  finalizeMineFinishNowSession,
  finalizeSpeedUpSession,
} from '../services/adService.js';

const router = express.Router();

// GET /api/user/:userId/buildings
router.get('/:userId/buildings', requireTelegramAuth, async (req, res) => {
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
router.post('/:userId/building/:buildingId/activate', requireTelegramAuth, async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await activateBuilding(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error activating building:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/collect', requireTelegramAuth, async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await collectResourcesFromBuilding(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error collecting resources:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/collect-x2', requireTelegramAuth, async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await createBuildingCollectSession(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error collecting resources x2:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/collect-x2/finalize', requireTelegramAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req.body || {};
    const result = await finalizeBuildingCollectSession(userId, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error finalizing resources x2:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/speed-up', requireTelegramAuth, async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await createSpeedUpSession(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error speeding up building production:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/speed-up/finalize', requireTelegramAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req.body || {};
    const result = await finalizeSpeedUpSession(userId, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error finalizing building speed-up:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/mine/start', requireTelegramAuth, async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const { mode } = req.body || {};
    const result = mode === 'ad_300'
      ? await createMineAdWorkersSession(userId, buildingId)
      : await startMineWorkers(userId, buildingId, mode);
    res.json(result);
  } catch (error) {
    console.error('Error starting mine workers:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/mine/start/finalize', requireTelegramAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req.body || {};
    const result = await finalizeMineAdWorkersSession(userId, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error finalizing mine workers start:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/mine/finish-now', requireTelegramAuth, async (req, res) => {
  try {
    const { userId, buildingId } = req.params;
    const result = await createMineFinishNowSession(userId, buildingId);
    res.json(result);
  } catch (error) {
    console.error('Error finishing mine work now:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/building/:buildingId/mine/finish-now/finalize', requireTelegramAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionId } = req.body || {};
    const result = await finalizeMineFinishNowSession(userId, sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error finalizing mine work now:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/building/:buildingId/upgrade
router.post('/:userId/building/:buildingId/upgrade', requireTelegramAuth, async (req, res) => {
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
