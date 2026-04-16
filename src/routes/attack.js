import express from 'express';
import { getRandomTarget } from '../services/attackService.js';

const router = express.Router();

router.get('/:userId/attack/target', async (req, res) => {
  try {
    const result = await getRandomTarget(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;