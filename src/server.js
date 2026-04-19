import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Import routes
import webhookRouter from './routes/webhook.js';
import userRouter from './routes/user.js';
import buildingsRouter from './routes/buildings.js';
import resourcesRouter from './routes/resources.js';
import questsRouter from './routes/quests.js';
import treasuryRouter from './routes/treasury.js';
import warehouseRouter from './routes/warehouse.js';
import marketRouter from './routes/market.js';
import barracksRouter from './routes/barracks.js';
import attackRouter from './routes/attack.js';
import adsgramRouter from './routes/adsgram.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const ADSGRAM_SDK_URL = 'https://sad.adsgram.ai/js/sad.min.js';

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));
app.use('/resources', express.static(join(__dirname, '../resources')));

app.get('/vendor/adsgram.js', async (req, res) => {
  try {
    const response = await fetch(ADSGRAM_SDK_URL);

    if (!response.ok) {
      return res.status(502).send('Failed to load AdsGram SDK');
    }

    const body = await response.text();
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (error) {
    console.error('Failed to proxy AdsGram SDK:', error);
    res.status(502).send('Failed to load AdsGram SDK');
  }
});

// API Routes
app.use('/webhook', webhookRouter);
app.use('/api/user', userRouter);
app.use('/api/user', buildingsRouter);
app.use('/api/user', resourcesRouter);
app.use('/api/user', questsRouter);
app.use('/api/user', treasuryRouter);
app.use('/api/user', warehouseRouter);
app.use('/api/user', marketRouter);
app.use('/api/user', barracksRouter);
app.use('/api/user', attackRouter);
app.use('/api/adsgram', adsgramRouter);

// Serve MiniApp HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

app.get('/wayclans', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

app.get('/wayclans/*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

export { app };
export default app;
