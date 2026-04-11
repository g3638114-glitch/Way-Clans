import express from 'express';
import { bot } from '../bot.js';

const router = express.Router();

// POST /webhook
router.post('/', express.json(), (req, res) => {
  console.log('📨 Webhook received:', {
    update_id: req.body?.update_id,
    message: req.body?.message?.text,
    command: req.body?.message?.entities,
  });

  try {
    bot.handleUpdate(req.body).catch(err => {
      console.error('Update handling error:', err);
    });
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

export default router;
