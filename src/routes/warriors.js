import express from 'express';
import { getDatabase } from '../database/init.js';
import {
  getUserWarriors,
  getUserWarriorsByType,
  countWarriorsByLevelAndType,
  hireWarrior,
  upgradeWarriors,
  getWarriorsSummary
} from '../services/warriorService.js';

/**
 * Warrior costs and stats configuration
 * Mirrored from frontend for server-side validation
 */
const WARRIOR_TYPES = ['attacker', 'defender'];

const HIRING_COSTS = {
  attacker: {
    gold: 250,
    wood: 65,
    stone: 65,
    meat: 10,
  },
  defender: {
    gold: 1000,
    wood: 500,
    stone: 500,
    meat: 100,
  },
};

const UPGRADE_COSTS = {
  attacker: {
    2: { gold: 20000, meat: 200 },
    3: { gold: 200000, meat: 400 },
    4: { gold: 1000000, meat: 1000 },
    5: { jabcoins: 1, meat: 5000 },
    6: { jabcoins: 10, meat: 10000 },
  },
  defender: {
    2: { gold: 10000, meat: 100 },
    3: { gold: 100000, meat: 200 },
    4: { gold: 500000, meat: 500 },
    5: { gold: 1000000, meat: 1000 },
    6: { jabcoins: 10, meat: 10000 },
  },
};

const router = express.Router();

/**
 * GET /api/user/:userId/warriors
 * Get all warriors for a specific user
 */
router.get('/:userId/warriors', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const client = await getDatabase();
    const warriors = await getUserWarriors(client, userId);

    return res.json({ success: true, data: warriors });
  } catch (error) {
    console.error('Error getting warriors:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/:userId/warriors/:type
 * Get warriors of a specific type for a user
 */
router.get('/:userId/warriors/:type', async (req, res) => {
  try {
    const { userId, type } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!WARRIOR_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid warrior type' });
    }

    const client = await getDatabase();
    const warriors = await getUserWarriorsByType(client, userId, type);

    return res.json({ success: true, data: warriors });
  } catch (error) {
    console.error('Error getting warriors by type:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/user/:userId/warriors/hire
 * Hire a new warrior at level 1
 */
router.post('/:userId/warriors/hire', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, level } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!WARRIOR_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid warrior type' });
    }

    if (level !== 1) {
      return res.status(400).json({ error: 'Can only hire warriors at level 1' });
    }

    const client = await getDatabase();

    // Get user's current resources
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const costs = HIRING_COSTS[type];

    // Check if user has enough resources
    if (user.gold < costs.gold) {
      return res.status(400).json({ error: 'Not enough Jamcoin' });
    }
    if (user.wood < costs.wood) {
      return res.status(400).json({ error: 'Not enough wood' });
    }
    if (user.stone < costs.stone) {
      return res.status(400).json({ error: 'Not enough stone' });
    }
    if (user.meat < costs.meat) {
      return res.status(400).json({ error: 'Not enough meat' });
    }

    // Deduct resources from user
    await client.query(
      `UPDATE users SET gold = gold - $1, wood = wood - $2, stone = stone - $3, meat = meat - $4, updated_at = NOW()
       WHERE id = $5`,
      [costs.gold, costs.wood, costs.stone, costs.meat, userId]
    );

    // Create warrior
    const warrior = await hireWarrior(client, userId, type, level);

    // Get updated user data
    const updatedUserResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const updatedUser = updatedUserResult.rows[0];

    return res.json({
      success: true,
      data: {
        warrior,
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Error hiring warrior:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/user/:userId/warriors/upgrade
 * Upgrade warriors from one level to another
 */
router.post('/:userId/warriors/upgrade', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, fromLevel, toLevel } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    if (!WARRIOR_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid warrior type' });
    }

    if (typeof fromLevel !== 'number' || typeof toLevel !== 'number') {
      return res.status(400).json({ error: 'Invalid level format' });
    }

    if (toLevel <= fromLevel || toLevel > 6 || fromLevel < 1) {
      return res.status(400).json({ error: 'Invalid level range' });
    }

    const client = await getDatabase();

    // Get user's current resources
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get warriors at the current level
    const warriorsCount = await countWarriorsByLevelAndType(client, userId, type, fromLevel);
    if (warriorsCount === 0) {
      return res.status(400).json({ error: 'No warriors at this level to upgrade' });
    }

    // Get upgrade cost for this level
    const costs = UPGRADE_COSTS[type][toLevel];
    if (!costs) {
      return res.status(400).json({ error: 'Invalid upgrade level' });
    }

    // Check if user has enough resources for ONE upgrade
    // (We only upgrade one warrior at a time)
    if (costs.gold && user.gold < costs.gold) {
      return res.status(400).json({ error: 'Not enough Jamcoin' });
    }
    if (costs.meat && user.meat < costs.meat) {
      return res.status(400).json({ error: 'Not enough meat' });
    }
    if (costs.jabcoins && user.jabcoins < costs.jabcoins) {
      return res.status(400).json({ error: 'Not enough Jabcoins' });
    }

    // Deduct resources from user (only for one upgrade)
    const updateQuery = `
      UPDATE users SET 
        ${costs.gold ? 'gold = gold - ' + costs.gold : ''}
        ${costs.gold && costs.meat ? ',' : ''}
        ${costs.meat ? 'meat = meat - ' + costs.meat : ''}
        ${(costs.gold || costs.meat) && costs.jabcoins ? ',' : ''}
        ${costs.jabcoins ? 'jabcoins = jabcoins - ' + costs.jabcoins : ''}
        , updated_at = NOW()
      WHERE id = $1
    `;

    await client.query(updateQuery, [userId]);

    // Upgrade one warrior (LIMIT 1)
    const result = await client.query(
      `UPDATE warriors 
       SET level = $1, updated_at = NOW()
       WHERE user_id = $2 AND type = $3 AND level = $4
       LIMIT 1
       RETURNING *`,
      [toLevel, userId, type, fromLevel]
    );

    // Get updated user data
    const updatedUserResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    const updatedUser = updatedUserResult.rows[0];

    return res.json({
      success: true,
      data: {
        upgradeCount: result.rows.length,
        warrior: result.rows[0],
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Error upgrading warrior:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/:userId/warriors/summary
 * Get summary of all warriors for a user
 */
router.get('/:userId/warriors/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const client = await getDatabase();
    const summary = await getWarriorsSummary(client, userId);

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error getting warriors summary:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
