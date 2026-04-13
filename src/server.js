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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// API Routes
// Order matters: more specific routes first, then general routes
app.use('/webhook', webhookRouter);
app.use('/api/user', userRouter);  // Includes /api/user/auth/verify (specific) and /api/user/:userId (dynamic)
app.use('/api/user', buildingsRouter);
app.use('/api/user', resourcesRouter);
app.use('/api/user', treasuryRouter);
app.use('/api/user', questsRouter);

// Serve MiniApp HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

export { app };
export default app;
