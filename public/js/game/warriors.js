// Warrior configuration with all levels and stats
// Easy to extend - just add new level objects to the levels array

export const WARRIORS = {
  defender: {
    id: 'defender',
    name: 'Защищающий',
    icon: '🛡',
    description: 'Специалист в защите, высокое здоровье',
    hireCost: {
      gold: 1000,
      wood: 500,
      stone: 500,
      meat: 100,
    },
    levels: [
      {
        level: 1,
        damage: 100,
        health: 200,
        upgradeCost: null, // First level has no upgrade cost
      },
      {
        level: 2,
        damage: 200,
        health: 400,
        upgradeCost: {
          gold: 10000,
          meat: 100,
        },
      },
      {
        level: 3,
        damage: 400,
        health: 800,
        upgradeCost: {
          gold: 100000,
          meat: 200,
        },
      },
      {
        level: 4,
        damage: 1200,
        health: 1600,
        upgradeCost: {
          gold: 500000,
          meat: 500,
        },
      },
      {
        level: 5,
        damage: 2400,
        health: 3200,
        upgradeCost: {
          gold: 1000000,
          meat: 1000,
        },
      },
      {
        level: 6,
        damage: 5000,
        health: 10000,
        upgradeCost: {
          jabcoin: 10,
          meat: 10000,
        },
      },
    ],
  },

  attacker: {
    id: 'attacker',
    name: 'Атакующий',
    icon: '⚔',
    description: 'Специалист в атаке, сбалансированные характеристики',
    hireCost: {
      gold: 250,
      wood: 65,
      stone: 65,
      meat: 10,
    },
    levels: [
      {
        level: 1,
        damage: 200,
        health: 200,
        upgradeCost: null, // First level has no upgrade cost
        loot: {
          gold: 31,
          wood: 15,
          stone: 15,
          meat: 1,
        },
      },
      {
        level: 2,
        damage: 400,
        health: 400,
        upgradeCost: {
          gold: 20000,
          meat: 200,
        },
        loot: {
          gold: 62,
          wood: 30,
          stone: 30,
          meat: 2,
        },
      },
      {
        level: 3,
        damage: 1600,
        health: 1600,
        upgradeCost: {
          gold: 200000,
          meat: 400,
        },
        loot: {
          gold: 125,
          wood: 60,
          stone: 60,
          meat: 4,
        },
      },
      {
        level: 4,
        damage: 3200,
        health: 3200,
        upgradeCost: {
          gold: 1000000,
          meat: 1000,
        },
        loot: {
          gold: 400,
          wood: 150,
          stone: 150,
          meat: 10,
        },
      },
      {
        level: 5,
        damage: 6400,
        health: 6400,
        upgradeCost: {
          jabcoin: 1,
          meat: 5000,
        },
        loot: {
          gold: 800,
          wood: 300,
          stone: 300,
          meat: 20,
        },
      },
      {
        level: 6,
        damage: 20000,
        health: 20000,
        upgradeCost: {
          jabcoin: 10,
          gold: 0,
          meat: 10000,
        },
        loot: {
          gold: 2000,
          wood: 500,
          stone: 500,
          meat: 30,
        },
      },
    ],
  },
};

/**
 * Get warrior configuration by ID
 */
export function getWarrior(warriorId) {
  return WARRIORS[warriorId];
}

/**
 * Get specific level data for a warrior
 */
export function getWarriorLevel(warriorId, level) {
  const warrior = getWarrior(warriorId);
  if (!warrior) return null;
  return warrior.levels.find(l => l.level === level) || null;
}

/**
 * Get all warriors
 */
export function getAllWarriors() {
  return Object.values(WARRIORS);
}

/**
 * Format cost object to readable string
 */
export function formatCost(cost) {
  if (!cost) return 'Улучшено максимально';

  const parts = [];
  if (cost.gold) parts.push(`${cost.gold} 💰`);
  if (cost.jabcoin) parts.push(`${cost.jabcoin} 💎`);
  if (cost.meat) parts.push(`${cost.meat} 🍖`);
  if (cost.wood) parts.push(`${cost.wood} 🌲`);
  if (cost.stone) parts.push(`${cost.stone} 🪨`);

  return parts.join(', ') || 'Бесплатно';
}
