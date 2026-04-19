import express from 'express';

const router = express.Router();

const ADSGRAM_REWARD_TOKEN = process.env.ADSGRAM_REWARD_TOKEN || 'c6a7a8b7cd30418d9844aebc37b6aaf2';

router.get('/reward', async (req, res) => {
  try {
    const userId = req.query.userid;
    const token = req.query.token;
    const placement = req.query.placement || 'unknown';

    if (token !== ADSGRAM_REWARD_TOKEN) {
      return res.status(403).send('forbidden');
    }

    if (!userId) {
      return res.status(400).send('missing userid');
    }

    console.log(`AdsGram reward callback received: user=${userId}, placement=${placement}`);

    return res.status(200).send('ok');
  } catch (error) {
    console.error('AdsGram reward callback error:', error);
    return res.status(500).send('error');
  }
});

export default router;
