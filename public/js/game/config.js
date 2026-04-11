/**
 * Building Configuration System
 * Easily modifiable parameters for all building types, levels, and mechanics
 */

// ============================================================================
// BUILDING TYPES & METADATA
// ============================================================================
export const BUILDING_TYPES = {
  mine: {
    name: 'Шахта',
    icon: '⛏',
    resource: 'gold',
    resourceEmoji: '💰',
  },
  quarry: {
    name: 'Каменоломня',
    icon: '🪨',
    resource: 'stone',
    resourceEmoji: '🪨',
  },
  lumber_mill: {
    name: 'Лесопилка',
    icon: '🌲',
    resource: 'wood',
    resourceEmoji: '🌲',
  },
  farm: {
    name: 'Ферма',
    icon: '🍖',
    resource: 'meat',
    resourceEmoji: '🍖',
  },
};

// ============================================================================
// PRODUCTION RATES PER LEVEL (resources per hour)
// Key: building type, Value: array of production rates [level1, level2, level3, level4, level5]
// ============================================================================
export const PRODUCTION_PER_LEVEL = {
  mine: [100, 150, 225, 337, 505],      // 50% increase per level
  quarry: [80, 120, 180, 270, 405],
  lumber_mill: [90, 135, 202, 303, 454],
  farm: [70, 105, 157, 235, 352],
};

// ============================================================================
// CAPACITY PER LEVEL (max resources that can accumulate)
// Key: building type, Value: array of capacities [level1, level2, level3, level4, level5]
// ============================================================================
export const CAPACITY_PER_LEVEL = {
  mine: [1000, 1500, 2250, 3375, 5062],      // 50% increase per level
  quarry: [800, 1200, 1800, 2700, 4050],
  lumber_mill: [900, 1350, 2025, 3037, 4556],
  farm: [700, 1050, 1575, 2362, 3543],
};

// ============================================================================
// UPGRADE COSTS
// mine: costs in [stone, wood] per level
// others: costs in [gold] per level
// ============================================================================
export const UPGRADE_COSTS = {
  mine: {
    // [stone cost, wood cost] for each level
    1: [100, 100],
    2: [200, 200],
    3: [400, 400],
    4: [800, 800],
    5: [1600, 1600],
  },
  quarry: {
    // [gold cost] for each level
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get building metadata (name, icon, resource type, etc.)
 * @param {string} buildingType - Type of building
 * @returns {object} Building metadata
 */
export function getBuildingConfig(buildingType) {
  return BUILDING_TYPES[buildingType] || BUILDING_TYPES.mine;
}

/**
 * Get production rate for a building at a specific level
 * @param {string} buildingType - Type of building
 * @param {number} level - Building level (1-5)
 * @returns {number} Production rate per hour
 */
export function getProductionRate(buildingType, level) {
  const rates = PRODUCTION_PER_LEVEL[buildingType] || PRODUCTION_PER_LEVEL.mine;
  return rates[level - 1] || rates[rates.length - 1];
}

/**
 * Get capacity for a building at a specific level
 * @param {string} buildingType - Type of building
 * @param {number} level - Building level (1-5)
 * @returns {number} Maximum capacity
 */
export function getCapacity(buildingType, level) {
  const capacities = CAPACITY_PER_LEVEL[buildingType] || CAPACITY_PER_LEVEL.mine;
  return capacities[level - 1] || capacities[capacities.length - 1];
}

/**
 * Get upgrade cost for a building level
 * @param {string} buildingType - Type of building
 * @param {number} nextLevel - Level to upgrade to (2-5)
 * @returns {object} Cost object {resource: amount} or {stone: amount, wood: amount} for mine
 */
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

/**
 * Get building name
 * @param {string} type - Building type
 * @returns {string} Building name
 */
export function getBuildingName(type) {
  return BUILDING_TYPES[type]?.name || 'Здание';
}

/**
 * Get building icon
 * @param {string} type - Building type
 * @returns {string} Building icon emoji
 */
export function getBuildingIcon(type) {
  return BUILDING_TYPES[type]?.icon || '🏢';
}

/**
 * Get resource type for a building
 * @param {string} type - Building type
 * @returns {string} Resource name (gold, stone, wood, meat)
 */
export function getResourceType(type) {
  return BUILDING_TYPES[type]?.resource || 'gold';
}

/**
 * Get resource emoji for a building
 * @param {string} type - Building type
 * @returns {string} Resource emoji
 */
export function getResourceEmoji(type) {
  return BUILDING_TYPES[type]?.resourceEmoji || '💰';
}
