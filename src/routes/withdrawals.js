import express from 'express';
import { requireTelegramAuth } from '../middleware/telegramAuth.js';
import { createWithdrawalRequest, getWithdrawalHistory } from '../services/withdrawalService.js';
import { notifyAdminWithdrawal } from '../bot.js';

const router = express.Router();

router.get('/:userId/withdrawals', requireTelegramAuth, async (req, res) => {
  try {
    const result = await getWithdrawalHistory(req.params.userId);
    res.json(result);
  } catch (error) {
    console.error('Error loading withdrawal history:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

router.post('/:userId/withdrawals', requireTelegramAuth, async (req, res) => {
  try {
    const result = await createWithdrawalRequest(req.params.userId, req.body || {});
    try {
      await notifyAdminWithdrawal(result.withdrawal, result.user, req.telegramUser);
    } catch (notifyError) {
      console.warn('⚠️ Failed to send withdrawal to admin chat:', notifyError.message);
    }
    const { destinationRaw, ...safeWithdrawal } = result.withdrawal;
    res.json({ ...result, withdrawal: safeWithdrawal });
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    res.status(400).json({ error: error.message || 'Server error' });
  }
});

export default router;
