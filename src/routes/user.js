import express from 'express';
import { supabase } from '../bot.js';

const router = express.Router();

// GET /api/user/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user/:userId/buildings
router.get('/:userId/buildings', async (req, res) => {
  try {
    const { userId } = req.params;

    // First get user by telegram_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all buildings for this user
    const { data: buildings, error } = await supabase
      .from('user_buildings')
      .select('*')
      .eq('user_id', user.id)
      .order('building_type')
      .order('building_number');

    if (error) {
      console.error('Error fetching buildings:', error);
      return res.status(500).json({ error: 'Failed to fetch buildings' });
    }

    res.json(buildings || []);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
