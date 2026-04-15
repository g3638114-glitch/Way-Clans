/**
 * Warrior Configuration for Barracks
 * Contains all stats, upgrade costs, hiring costs, and production rates
 */

export const WARRIOR_TYPES = {
  attacker: {
    id: 'attacker',
    name: 'Атакующий',
    emoji: '⚔️',
    description: 'Боец, специализирующийся на атаке',
  },
  defender: {
    id: 'defender',
    name: 'Защищающий',
    emoji: '🛡️',
    description: 'Боец, специализирующийся на защите',
  },
};

/**
 * Defender (Защитник) Stats
 * Each level contains: damage, hp
 * Upgrade cost to next level: gold (Jamcoin) and meat
 */
export const DEFENDER_LEVELS = {
  1: {
    level: 1,
    damage: 100,
    hp: 200,
    upgradeCost: null, // Cannot upgrade from level 1
  },
  2: {
    level: 2,
    damage: 200,
    hp: 400,
    upgradeCost: {
      gold: 10000,
      meat: 100,
    },
  },
  3: {
    level: 3,
    damage: 400,
    hp: 800,
    upgradeCost: {
      gold: 100000,
      meat: 200,
    },
  },
  4: {
    level: 4,
    damage: 1200,
    hp: 1600,
    upgradeCost: {
      gold: 500000,
      meat: 500,
    },
  },
  5: {
    level: 5,
    damage: 2400,
    hp: 3200,
    upgradeCost: {
      gold: 1000000,
      meat: 1000,
    },
  },
  6: {
    level: 6,
    damage: 5000,
    hp: 10000,
    upgradeCost: {
      jabcoins: 10,
      meat: 10000,
    },
  },
};

/**
 * Attacker (Атакующий) Stats
 * Each level contains: damage, hp
 * Upgrade cost to next level: gold (Jamcoin), meat, and other resources
 */
export const ATTACKER_LEVELS = {
  1: {
    level: 1,
    damage: 200,
    hp: 200,
    upgradeCost: null, // Cannot upgrade from level 1
  },
  2: {
    level: 2,
    damage: 400,
    hp: 400,
    upgradeCost: {
      gold: 20000,
      meat: 200,
    },
  },
  3: {
    level: 3,
    damage: 1600,
    hp: 1600,
    upgradeCost: {
      gold: 200000,
      meat: 400,
    },
  },
  4: {
    level: 4,
    damage: 3200,
    hp: 3200,
    upgradeCost: {
      gold: 1000000,
      meat: 1000,
    },
  },
  5: {
    level: 5,
    damage: 6400,
    hp: 6400,
    upgradeCost: {
      jabcoins: 1,
      meat: 5000,
    },
  },
  6: {
    level: 6,
    damage: 20000,
    hp: 20000,
    upgradeCost: {
      jabcoins: 10,
      gold: 0, // Placeholder, will specify exact amount if needed
      meat: 10000,
    },
  },
};

/**
 * Hiring Costs - Cost to recruit one warrior
 */
export const HIRING_COSTS = {
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

/**
 * Production Rates for Attacker warriors
 * Each level determines how much resources are gained per hour
 */
export const ATTACKER_PRODUCTION = {
  1: {
    gold: 31,
    wood: 15,
    stone: 15,
    meat: 1,
  },
  2: {
    gold: 62,
    wood: 30,
    stone: 30,
    meat: 2,
  },
  3: {
    gold: 125,
    wood: 60,
    stone: 60,
    meat: 4,
  },
  4: {
    gold: 400,
    wood: 150,
    stone: 150,
    meat: 10,
  },
  5: {
    gold: 800,
    wood: 300,
    stone: 300,
    meat: 20,
  },
  6: {
    gold: 2000,
    wood: 500,
    stone: 500,
    meat: 30,
  },
};

/**
 * Get stats for a specific warrior and level
 * @param {string} warriorType - 'attacker' or 'defender'
 * @param {number} level - Warrior level (1-6)
 * @returns {object} Warrior stats at that level
 */
export function getWarriorStats(warriorType, level) {
  if (warriorType === 'attacker') {
    return ATTACKER_LEVELS[level];
  } else if (warriorType === 'defender') {
    return DEFENDER_LEVELS[level];
  }
  return null;
}

/**
 * Get production rates for attacker
 * Defenders don't produce resources
 * @param {number} level - Warrior level (1-6)
 * @returns {object} Production rates per hour
 */
export function getAttackerProduction(level) {
  return ATTACKER_PRODUCTION[level] || null;
}
