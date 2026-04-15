// Warrior type constants
export const WARRIOR_TYPES = {
  ATTACKER: 'attacker',
  DEFENDER: 'defender',
};

// Defender warrior configuration
const DEFENDER_LEVELS = [
  {
    level: 1,
    damage: 100,
    hp: 200,
    upgradeCost: null, // First level, no upgrade cost
  },
  {
    level: 2,
    damage: 200,
    hp: 400,
    upgradeCost: { jamcoin: 10000, meat: 100 },
  },
  {
    level: 3,
    damage: 400,
    hp: 800,
    upgradeCost: { jamcoin: 100000, meat: 200 },
  },
  {
    level: 4,
    damage: 1200,
    hp: 1600,
    upgradeCost: { jamcoin: 500000, meat: 500 },
  },
  {
    level: 5,
    damage: 2400,
    hp: 3200,
    upgradeCost: { jamcoin: 1000000, meat: 1000 },
  },
  {
    level: 6,
    damage: 5000,
    hp: 10000,
    upgradeCost: { jabcoin: 10, meat: 10000 },
  },
];

// Attacker warrior configuration
const ATTACKER_LEVELS = [
  {
    level: 1,
    damage: 200,
    hp: 200,
    upgradeCost: null, // First level, no upgrade cost
    productionCost: { jamcoin: 250, wood: 65, stone: 65, meat: 10 },
    production: { jamcoin: 31, wood: 15, stone: 15, meat: 1 },
  },
  {
    level: 2,
    damage: 400,
    hp: 400,
    upgradeCost: { jamcoin: 20000, meat: 200 },
    productionCost: { jamcoin: 250, wood: 65, stone: 65, meat: 10 },
    production: { jamcoin: 62, wood: 30, stone: 30, meat: 2 },
  },
  {
    level: 3,
    damage: 1600,
    hp: 1600,
    upgradeCost: { jamcoin: 200000, meat: 400 },
    productionCost: { jamcoin: 250, wood: 65, stone: 65, meat: 10 },
    production: { jamcoin: 125, wood: 60, stone: 60, meat: 4 },
  },
  {
    level: 4,
    damage: 3200,
    hp: 3200,
    upgradeCost: { jamcoin: 1000000, meat: 1000 },
    productionCost: { jamcoin: 250, wood: 65, stone: 65, meat: 10 },
    production: { jamcoin: 400, wood: 150, stone: 150, meat: 10 },
  },
  {
    level: 5,
    damage: 6400,
    hp: 6400,
    upgradeCost: { jabcoin: 1, meat: 5000 },
    productionCost: { jamcoin: 250, wood: 65, stone: 65, meat: 10 },
    production: { jamcoin: 800, wood: 300, stone: 300, meat: 20 },
  },
  {
    level: 6,
    damage: 20000,
    hp: 20000,
    upgradeCost: { jabcoin: 10, gold: 1, meat: 10000 },
    productionCost: { jamcoin: 250, wood: 65, stone: 65, meat: 10 },
    production: { jamcoin: 2000, wood: 500, stone: 500, meat: 30 },
  },
];

// Defender recruitment cost (same for all levels)
const DEFENDER_RECRUITMENT_COST = {
  jamcoin: 1000,
  wood: 500,
  stone: 500,
  meat: 100,
};

// Get warrior level data by type and level
export function getWarriorLevelData(type, level) {
  const levels = type === WARRIOR_TYPES.ATTACKER ? ATTACKER_LEVELS : DEFENDER_LEVELS;
  return levels.find(l => l.level === level) || null;
}

// Get all levels for a warrior type
export function getWarriorLevels(type) {
  return type === WARRIOR_TYPES.ATTACKER ? ATTACKER_LEVELS : DEFENDER_LEVELS;
}

// Get recruitment cost
export function getRecruitmentCost(type) {
  if (type === WARRIOR_TYPES.ATTACKER) {
    return ATTACKER_LEVELS[0].productionCost;
  } else {
    return DEFENDER_RECRUITMENT_COST;
  }
}

// Check if player has enough resources for a cost
export function canAffordCost(userResources, cost) {
  for (const [resource, amount] of Object.entries(cost)) {
    if ((userResources[resource] || 0) < amount) {
      return false;
    }
  }
  return true;
}

// Format cost for display
export function formatCostDisplay(cost) {
  const items = [];
  if (cost.jamcoin) items.push(`${cost.jamcoin} Jamcoin`);
  if (cost.wood) items.push(`${cost.wood} 🌲`);
  if (cost.stone) items.push(`${cost.stone} 🪨`);
  if (cost.meat) items.push(`${cost.meat} 🍖`);
  if (cost.jabcoin) items.push(`${cost.jabcoin} 💎`);
  if (cost.gold) items.push(`${cost.gold} 🏆`);
  return items.join(', ');
}
