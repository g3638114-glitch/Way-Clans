import { supabase } from '../bot.js';

/**
 * Get all warriors for a user
 */
export async function getUserWarriors(userId) {
  const { data, error } = await supabase
    .from('warriors')
    .select('*')
    .eq('user_id', userId)
    .order('type', { ascending: true })
    .order('level', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get warriors: ${error.message}`);
  }

  return data || [];
}

/**
 * Get warriors of a specific type for a user
 */
export async function getUserWarriorsByType(userId, type) {
  const { data, error } = await supabase
    .from('warriors')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('level', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get warriors: ${error.message}`);
  }

  return data || [];
}

/**
 * Count warriors at a specific level and type
 */
export async function countWarriorsByLevelAndType(userId, type, level) {
  const { data, error, count } = await supabase
    .from('warriors')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .eq('level', level);

  if (error) {
    throw new Error(`Failed to count warriors: ${error.message}`);
  }

  return count || 0;
}

/**
 * Hire a new warrior (always at level 1)
 * Returns the hired warrior data
 */
export async function hireWarrior(userId, type, level) {
  if (level !== 1) {
    throw new Error('Can only hire warriors at level 1');
  }

  const { data, error } = await supabase
    .from('warriors')
    .insert({
      user_id: userId,
      type: type,
      level: level,
      hired_at: Math.floor(Date.now() / 1000)
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to hire warrior: ${error.message}`);
  }

  return data;
}

/**
 * Upgrade one warrior from one level to another
 * Returns the upgraded warrior
 */
export async function upgradeWarrior(userId, type, fromLevel, toLevel) {
  if (toLevel <= fromLevel) {
    throw new Error('Target level must be greater than current level');
  }

  if (toLevel > 6 || fromLevel < 1) {
    throw new Error('Invalid level range');
  }

  // Find one warrior at fromLevel
  const { data: warrior, error: fetchError } = await supabase
    .from('warriors')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('level', fromLevel)
    .limit(1)
    .single();

  if (fetchError || !warrior) {
    throw new Error('No warrior at this level to upgrade');
  }

  // Update that warrior to toLevel
  const { data, error } = await supabase
    .from('warriors')
    .update({
      level: toLevel,
      updated_at: new Date().toISOString()
    })
    .eq('id', warrior.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upgrade warrior: ${error.message}`);
  }

  return data;
}

/**
 * Get summary of all warriors for a user
 */
export async function getWarriorsSummary(userId) {
  const { data, error } = await supabase
    .from('warriors')
    .select('type, level')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to get warriors summary: ${error.message}`);
  }

  const summary = {
    attacker: {},
    defender: {}
  };

  (data || []).forEach(warrior => {
    if (!summary[warrior.type]) {
      summary[warrior.type] = {};
    }
    summary[warrior.type][warrior.level] = (summary[warrior.type][warrior.level] || 0) + 1;
  });

  return summary;
}
