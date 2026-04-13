/**
 * Server-side building configuration
 * This mirrors the frontend config for consistency
 */

// ============================================================================
// PRODUCTION RATES PER LEVEL (resources per hour)
// ============================================================================
export const PRODUCTION_PER_LEVEL = {
  mine: [100, 150, 225, 337, 505],
  quarry: [80, 120, 180, 270, 405],
  lumber_mill: [90, 135, 202, 303, 454],
  farm: [70, 105, 157, 235, 352],
};

// ============================================================================
// CAPACITY PER LEVEL (max resources that can accumulate)
// ============================================================================
export const CAPACITY_PER_LEVEL = {
  mine: [1000, 1500, 2250, 3375, 5062],
  quarry: [800, 1200, 1800, 2700, 4050],
  lumber_mill: [900, 1350, 2025, 3037, 4556],
  farm: [700, 1050, 1575, 2362, 3543],
};

// ============================================================================
// UPGRADE COSTS
// ============================================================================
export const UPGRADE_COSTS = {
  mine: {
    1: [100, 100],
    2: [200, 200],
    3: [400, 400],
    4: [800, 800],
    5: [1600, 1600],
  },
  quarry: {
    1: [300],
    2: [700],
    3: [1600],
    4: [3500],
    5: [7500],
  },
  lumber_mill: {
    1: [250],
    2: [600],
    3: [1400],
    4: [3000],
    5: [6500],
  },
  farm: {
    1: [200],
    2: [500],
    3: [1200],
    4: [2500],
    5: [5500],
  },
};

// ============================================================================
// Helper functions
// ============================================================================

export function getProductionRate(buildingType, level) {
  const rates = PRODUCTION_PER_LEVEL[buildingType] || PRODUCTION_PER_LEVEL.mine;
  return rates[level - 1] || rates[rates.length - 1];
}

export function getCapacity(buildingType, level) {
  const capacities = CAPACITY_PER_LEVEL[buildingType] || CAPACITY_PER_LEVEL.mine;
  return capacities[level - 1] || capacities[capacities.length - 1];
}

export function getUpgradeCost(buildingType, nextLevel) {
  if (nextLevel < 2 || nextLevel > 5) return null;

  const cost = UPGRADE_COSTS[buildingType]?.[nextLevel];
  if (!cost) return null;

  if (buildingType === 'mine') {
    return { stone: cost[0], wood: cost[1] };
  } else {
    return { gold: cost[0] };
  }
}

export function getResourceType(buildingType) {
  const types = {
    mine: 'gold',
    quarry: 'stone',
    lumber_mill: 'wood',
    farm: 'meat',
  };
  return types[buildingType] || 'gold';
}

// ============================================================================
// TREASURY (КАЗНА) - JAMCOIN STORAGE (Gold/💰)
// ============================================================================
export const TREASURY_CONFIG = {
  maxLevel: 6,
  baseCosts: {
    1: { gold: 500, stone: 300, wood: 300 },
    2: { gold: 625, stone: 625, wood: 625 },
    3: { gold: 1250, stone: 1250, wood: 1250 },
    4: { gold: 2500, stone: 2500, wood: 2500 },
    5: { gold: 5000, stone: 5000, wood: 5000 },
    5: { gold: 10000, stone: 10000, wood: 10000 },
  },
  capacityPerLevel: [31250, 62500, 125000, 250000, 500000, 1000000],
};

export function getTreasuryCapacity(level) {
  const capacities = TREASURY_CONFIG.capacityPerLevel;
  return capacities[Math.max(0, level - 1)];
}

export function getTreasuryCost(nextLevel) {
  if (nextLevel < 2 || nextLevel > 6) return null;
  return TREASURY_CONFIG.baseCosts[nextLevel];
}

// ============================================================================
// STORAGE (СКЛАД) - RESOURCE STORAGE
// ============================================================================
export const STORAGE_CONFIG = {
  maxLevel: 6,
  baseCosts: {
    1: { gold: 500, stone: 300, wood: 300 },
    2: { gold: 625, stone: 625, wood: 625 },
    3: { gold: 1250, stone: 1250, wood: 1250 },
    4: { gold: 2500, stone: 2500, wood: 2500 },
    5: { gold: 5000, stone: 5000, wood: 5000 },
    5: { gold: 10000, stone: 10000, wood: 10000 },
  },
  capacityPerLevel: [5000, 30000, 60000, 120000, 5000000],
};

export function getStorageCapacity(level) {
  const capacities = STORAGE_CONFIG.capacityPerLevel;
  return capacities[Math.max(0, level - 1)];
}

export function getStorageCost(nextLevel) {
  if (nextLevel < 2 || nextLevel > 6) return null;
  return STORAGE_CONFIG.baseCosts[nextLevel];
}
