import express from 'express';
import { getUserWarehouse, upgradeWarehouse } from '../services/warehouseService.js';

const router = express.Router();

// GET /api/user/:userId/warehouse
router.get('/:userId/warehouse', async (req, res) => {
  try {
    const { userId } = req.params;
    const warehouse = await getUserWarehouse(userId);
    res.json({ success: true, warehouse });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

// POST /api/user/:userId/warehouse/upgrade
router.post('/:userId/warehouse/upgrade', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await upgradeWarehouse(userId);
    res.json(result);
  } catch (error) {
    console.error('Error upgrading warehouse:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
