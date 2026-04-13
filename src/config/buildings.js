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
// TREASURY (КАЗНА) - Gold/💰 Storage
// ============================================================================
// 💡 ЛЕГКО ДОБАВЛЯТЬ НОВЫЕ УРОВНИ:
//    1. Добавь новый элемент в capacityPerLevel
//    2. Добавь стоимость в costs (ключ = следующий уровень)
//    Пример: maxLevel 5 → 6:
//      capacityPerLevel: [...старые..., 160000],  // новый уровень
//      costs: { ...старые..., 6: { gold: 20000, stone: 12000, wood: 12000 } }
// ============================================================================
export const TREASURY_CONFIG = {
  name: 'Казна',
  icon: '🏰',
  resource: 'gold',
  // Вместимость для каждого уровня (уровень 1 = index 0)
  capacityPerLevel: [5000, 10000, 20000, 40000, 80000],
  // Стоимость обновления (уровень 2 = key 2, уровень 3 = key 3, и т.д.)
  costs: {
    2: { gold: 500, stone: 300, wood: 300 },
    3: { gold: 1200, stone: 700, wood: 700 },
    4: { gold: 2500, stone: 1500, wood: 1500 },
    5: { gold: 5000, stone: 3000, wood: 3000 },
  },
};

export function getTreasuryCapacity(level) {
  const level_index = Math.max(0, Math.min(level - 1, TREASURY_CONFIG.capacityPerLevel.length - 1));
  return TREASURY_CONFIG.capacityPerLevel[level_index];
}

export function getTreasuryMaxLevel() {
  return TREASURY_CONFIG.capacityPerLevel.length;
}

export function getTreasuryCost(nextLevel) {
  if (nextLevel < 2 || nextLevel > getTreasuryMaxLevel()) return null;
  return TREASURY_CONFIG.costs[nextLevel] || null;
}

// ============================================================================
// STORAGE (СКЛАД) - Resource Storage
// ============================================================================
// 💡 ЛЕГКО ДОБАВЛЯТЬ НОВЫЕ УРОВНИ: см. примечание у TREASURY_CONFIG выше
// ============================================================================
export const STORAGE_CONFIG = {
  name: 'Склад',
  icon: '📦',
  // Вместимость для каждого уровня (уровень 1 = index 0)
  capacityPerLevel: [5000, 10000, 20000, 40000, 80000],
  // Стоимость обновления (уровень 2 = key 2, уровень 3 = key 3, и т.д.)
  costs: {
    2: { gold: 300, stone: 200, wood: 200 },
    3: { gold: 800, stone: 500, wood: 500 },
    4: { gold: 1800, stone: 1000, wood: 1000 },
    5: { gold: 3500, stone: 2000, wood: 2000 },
  },
};

export function getStorageCapacity(level) {
  const level_index = Math.max(0, Math.min(level - 1, STORAGE_CONFIG.capacityPerLevel.length - 1));
  return STORAGE_CONFIG.capacityPerLevel[level_index];
}

export function getStorageMaxLevel() {
  return STORAGE_CONFIG.capacityPerLevel.length;
}

export function getStorageCost(nextLevel) {
  if (nextLevel < 2 || nextLevel > getStorageMaxLevel()) return null;
  return STORAGE_CONFIG.costs[nextLevel] || null;
}
