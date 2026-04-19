/**
 * Server-side building configuration
 * This mirrors the frontend config for consistency
 */

// ============================================================================
// TREASURY (КАЗНА) CONFIGURATION
// Treasury stores Jamcoin 💰 (gold) and has upgrade levels
// ============================================================================
export const TREASURY_CAPACITY_PER_LEVEL = [
  31250,    // Level 1
  62500,    // Level 2
  125000,   // Level 3
  250000,   // Level 4
  500000,   // Level 5
  1000000,  // Level 6
];

// Upgrade costs: [jamcoins (gold), stone, wood] for each level (starting from level 2)
export const TREASURY_UPGRADE_COSTS = {
  2: [625, 625, 625],
  3: [1250, 1250, 1250],
  4: [2500, 2500, 2500],
  5: [5000, 5000, 5000],
  6: [10000, 10000, 10000],
};

// ============================================================================
// WAREHOUSE (СКЛАД) CONFIGURATION
// Warehouse stores wood, stone, and meat with upgrade levels
// ============================================================================
export const WAREHOUSE_CAPACITY_PER_LEVEL = [
  5000,     // Level 1
  30000,    // Level 2
  60000,    // Level 3
  120000,   // Level 4
  240000,   // Level 5
  500000,   // Level 6
];

// Upgrade costs: [jamcoins (gold), stone, wood] for each level (starting from level 2)
export const WAREHOUSE_UPGRADE_COSTS = {
  2: [625, 625, 625],
  3: [1250, 1250, 1250],
  4: [2500, 2500, 2500],
  5: [5000, 5000, 5000],
  6: [10000, 10000, 10000],
};

// ============================================================================
// PRODUCTION RATES PER LEVEL (resources per hour)
// ============================================================================
export const PRODUCTION_PER_LEVEL = {
  mine: [625, 1250, 2500, 5000, 10000, 20000],
  quarry: [312, 625, 1250, 2500, 5000, 10000],
  lumber_mill: [312, 625, 1250, 2500, 5000, 10000],
  farm: [10, 20, 40, 80, 160, 320],
};

// ============================================================================
// CAPACITY PER LEVEL (max resources that can accumulate)
// ============================================================================
export const CAPACITY_PER_LEVEL = {
  mine: [2000, 3000, 4500, 6750, 10124, 20248],
  quarry: [1600, 2400, 3600, 5400, 8100, 16200],
  lumber_mill: [1800, 2700, 4050, 6074, 9112, 18224],
  farm: [1400, 2100, 3150, 4724, 7086, 14172],
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
    6: [3200, 3200],
  },
  quarry: {
    1: [300],
    2: [700],
    3: [1600],
    4: [3500],
    5: [7500],
    6: [15000],
  },
  lumber_mill: {
    1: [250],
    2: [600],
    3: [1400],
    4: [3000],
    5: [6500],
    6: [13000],
  },
  farm: {
    1: [200],
    2: [500],
    3: [1200],
    4: [2500],
    5: [5500],
    6: [11000],
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
  if (nextLevel < 2 || nextLevel > 6) return null;

  const cost = UPGRADE_COSTS[buildingType]?.[nextLevel];
  if (!cost) return null;

  if (buildingType === 'mine') {
    return { stone: cost[0], wood: cost[1] };
  } else {
    return { gold: cost[0] };
  }
}

export function getMaxBuildingLevel() {
  return Math.max(...Object.values(PRODUCTION_PER_LEVEL).map((levels) => levels.length));
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
// TREASURY HELPER FUNCTIONS
// ============================================================================

export function getTreasuryCapacity(level) {
  const validLevel = Math.max(1, Math.min(level, TREASURY_CAPACITY_PER_LEVEL.length));
  return TREASURY_CAPACITY_PER_LEVEL[validLevel - 1];
}

export function getMaxTreasuryLevel() {
  return TREASURY_CAPACITY_PER_LEVEL.length;
}

export function getTreasuryUpgradeCost(nextLevel) {
  const cost = TREASURY_UPGRADE_COSTS[nextLevel];
  if (!cost) return null;
  return {
    jamcoins: cost[0],
    stone: cost[1],
    wood: cost[2],
  };
}

// ============================================================================
// WAREHOUSE HELPER FUNCTIONS
// ============================================================================

export function getWarehouseCapacity(level) {
  const validLevel = Math.max(1, Math.min(level, WAREHOUSE_CAPACITY_PER_LEVEL.length));
  return WAREHOUSE_CAPACITY_PER_LEVEL[validLevel - 1];
}

export function getMaxWarehouseLevel() {
  return WAREHOUSE_CAPACITY_PER_LEVEL.length;
}

export function getWarehouseUpgradeCost(nextLevel) {
  const cost = WAREHOUSE_UPGRADE_COSTS[nextLevel];
  if (!cost) return null;
  return {
    jamcoins: cost[0],
    stone: cost[1],
    wood: cost[2],
  };
}
