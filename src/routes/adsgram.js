import express from 'express';
import { verifyAdsgramSignature } from '../lib/adsgram.js';
import { confirmBuildingCollectReward, confirmMiningAdReward } from '../services/adService.js';

const router = express.Router();

router.get('/building/reward', async (req, res) => {
  try {
    const userId = Number(req.query.userid || req.query.userId || req.query.tgid);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ ok: false, error: 'Missing userId' });
    }

    await confirmBuildingCollectReward(userId);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Server error' });
  }
});

router.get('/mining/reward', async (req, res) => {
  try {
    const userId = Number(req.query.userid || req.query.userId || req.query.tgid);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ ok: false, error: 'Missing userId' });
    }

    await confirmMiningAdReward(userId);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Server error' });
  }
});

router.post('/callback', async (req, res) => {
  try {
    const secret = process.env.ADSGRAM_SECRET || process.env.ADSGRAM_TOKEN || '';
    const signatureHeader = req.headers['x-adsgram-signature'] || req.headers['x-signature'] || req.headers.signature;

    if (secret && !verifyAdsgramSignature(signatureHeader, secret, req.rawBody || '')) {
      return res.status(403).json({ ok: false, error: 'Invalid signature' });
    }

    const payload = req.body || {};
    const userId = Number(payload.userId || payload.userid || payload.tgid || req.query.userId || req.query.userid || req.query.tgid);
    const blockId = String(payload.blockId || payload.block_id || payload.adUnit || payload.ad_unit || '').trim();

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ ok: false, error: 'Missing userId' });
    }

    if (blockId === String(process.env.ADSGRAM_BUILDING_BLOCK_ID || '28172')) {
      await confirmBuildingCollectReward(userId);
    } else if (blockId === String(process.env.ADSGRAM_MINING_BLOCK_ID || '28167')) {
      await confirmMiningAdReward(userId);
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
});

export default router;
