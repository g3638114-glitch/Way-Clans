import pkg from 'pg';
const { Client } = pkg;

/**
 * Get all warriors for a user
 */
export async function getUserWarriors(client, userId) {
  const result = await client.query(
    'SELECT * FROM warriors WHERE user_id = $1 ORDER BY type, level, created_at',
    [userId]
  );
  return result.rows;
}

/**
 * Get warriors of a specific type for a user
 */
export async function getUserWarriorsByType(client, userId, type) {
  const result = await client.query(
    'SELECT * FROM warriors WHERE user_id = $1 AND type = $2 ORDER BY level, created_at',
    [userId, type]
  );
  return result.rows;
}

/**
 * Count warriors at a specific level and type
 */
export async function countWarriorsByLevelAndType(client, userId, type, level) {
  const result = await client.query(
    'SELECT COUNT(*) as count FROM warriors WHERE user_id = $1 AND type = $2 AND level = $3',
    [userId, type, level]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Hire a new warrior (always at level 1)
 * Returns the hired warrior data
 */
export async function hireWarrior(client, userId, type, level) {
  if (level !== 1) {
    throw new Error('Can only hire warriors at level 1');
  }

  const result = await client.query(
    `INSERT INTO warriors (user_id, type, level, hired_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, type, level, Math.floor(Date.now() / 1000)]
  );

  return result.rows[0];
}

/**
 * Upgrade warriors from one level to another
 * Upgrades all warriors of a given type from fromLevel to toLevel
 * Returns count of upgraded warriors
 */
export async function upgradeWarriors(client, userId, type, fromLevel, toLevel) {
  if (toLevel <= fromLevel) {
    throw new Error('Target level must be greater than current level');
  }

  if (toLevel > 6 || fromLevel < 1) {
    throw new Error('Invalid level range');
  }

  // Update all warriors of this type at fromLevel to toLevel
  const result = await client.query(
    `UPDATE warriors 
     SET level = $1, updated_at = NOW()
     WHERE user_id = $2 AND type = $3 AND level = $4
     RETURNING *`,
    [toLevel, userId, type, fromLevel]
  );

  return {
    count: result.rows.length,
    warriors: result.rows
  };
}

/**
 * Get summary of all warriors for a user
 */
export async function getWarriorsSummary(client, userId) {
  const result = await client.query(
    `SELECT type, level, COUNT(*) as count 
     FROM warriors 
     WHERE user_id = $1 
     GROUP BY type, level 
     ORDER BY type, level`,
    [userId]
  );

  const summary = {
    attacker: {},
    defender: {}
  };

  result.rows.forEach(row => {
    if (!summary[row.type]) {
      summary[row.type] = {};
    }
    summary[row.type][row.level] = parseInt(row.count, 10);
  });

  return summary;
}
