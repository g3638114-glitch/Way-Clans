/**
 * Building & Troop Configuration System
 */

// ============================================================================
// BUILDING CONFIGURATION
// ============================================================================
export const BUILDING_TYPES = {
  mine: { name: 'Шахта', icon: '⛏', resource: 'gold', resourceEmoji: '💰' },
  quarry: { name: 'Каменоломня', icon: '🪨', resource: 'stone', resourceEmoji: '🪨' },
  lumber_mill: { name: 'Лесопилка', icon: '🌲', resource: 'wood', resourceEmoji: '🌲' },
  farm: { name: 'Ферма', icon: '🍖', resource: 'meat', resourceEmoji: '🍖' },
};

export const TREASURY_CONFIG = { name: 'Казна', icon: '🏰', resource: 'gold', resourceEmoji: '💰' };
export const TREASURY_CAPACITY_PER_LEVEL = [31250, 62500, 125000, 250000, 500000, 1000000];
export const TREASURY_UPGRADE_COSTS = {
  2: [625, 625, 625], 3: [1250, 1250, 1250], 4: [2500, 2500, 2500], 5: [5000, 5000, 5000], 6: [10000, 10000, 10000],
};

export const WAREHOUSE_CONFIG = { name: 'Склад', icon: '🏭', resources: ['wood', 'stone', 'meat'], resourceEmojis: { wood: '🌲', stone: '🪨', meat: '🍖' } };
export const WAREHOUSE_CAPACITY_PER_LEVEL = [5000, 30000, 60000, 120000, 240000, 500000];
export const WAREHOUSE_UPGRADE_COSTS = {
  2: [625, 625, 625], 3: [1250, 1250, 1250], 4: [2500, 2500, 2500], 5: [5000, 5000, 5000], 6: [10000, 10000, 10000],
};

export const PRODUCTION_PER_LEVEL = {
  mine: [100, 150, 225, 337, 505], quarry: [80, 120, 180, 270, 405], lumber_mill: [90, 135, 202, 303, 454], farm: [70, 105, 157, 235, 352],
};

export const CAPACITY_PER_LEVEL = {
  mine: [1000, 1500, 2250, 3375, 5062], quarry: [800, 1200, 1800, 2700, 4050], lumber_mill: [900, 1350, 2025, 3037, 4556], farm: [700, 1050, 1575, 2362, 3543],
};

export const UPGRADE_COSTS = {
  mine: { 1: [100, 100], 2: [200, 200], 3: [400, 400], 4: [800, 800], 5: [1600, 1600] },
  quarry: { 1: [300], 2: [700], 3: [1600], 4: [3500], 5: [7500] },
  lumber_mill: { 1: [250], 2: [600], 3: [1400], 4: [3000], 5: [6500] },
  farm: { 1: [200], 2: [500], 3: [1200], 4: [2500], 5: [5500] },
};

// ============================================================================
// TROOP CONFIGURATION
// ============================================================================
export const TROOP_STATS = {
  defender: {
    1: { damage: 100, health: 200 },
    2: { damage: 200, health: 400, cost: { gold: 10000, meat: 100 } },
    3: { damage: 400, health: 800, cost: { gold: 100000, meat: 200 } },
    4: { damage: 1200, health: 1600, cost: { gold: 500000, meat: 500 } },
    5: { damage: 2400, health: 3200, cost: { gold: 1000000, meat: 1000 } },
    6: { damage: 5000, health: 10000, cost: { jabcoins: 10, meat: 10000 } },
  },
  attacker: {
    1: { damage: 200, health: 200, loot: { gold: 31, wood: 15, stone: 15, meat: 1 } },
    2: { damage: 400, health: 400, cost: { gold: 20000, meat: 200 }, loot: { gold: 62, wood: 30, stone: 30, meat: 2 } },
    3: { damage: 1600, health: 1600, cost: { gold: 200000, meat: 400 }, loot: { gold: 125, wood: 60, stone: 60, meat: 4 } },
    4: { damage: 3200, health: 3200, cost: { gold: 1000000, meat: 1000 }, loot: { gold: 400, wood: 150, stone: 150, meat: 10 } },
    5: { damage: 6400, health: 6400, cost: { jabcoins: 1, meat: 5000 }, loot: { gold: 800, wood: 300, stone: 300, meat: 20 } },
    6: { damage: 20000, health: 20000, cost: { jabcoins: 10, gold: 5000000, meat: 10000 }, loot: { gold: 2000, wood: 500, stone: 500, meat: 30 } },
  }
};

export const HIRE_COSTS = {
  attacker: { gold: 250, wood: 65, stone: 65, meat: 10 },
  defender: { gold: 1000, wood: 500, stone: 500, meat: 100 }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
export function getBuildingConfig(buildingType) { return BUILDING_TYPES[buildingType] || BUILDING_TYPES.mine; }
export function getProductionRate(buildingType, level) { const rates = PRODUCTION_PER_LEVEL[buildingType] || PRODUCTION_PER_LEVEL.mine; return rates[level - 1] || rates[rates.length - 1]; }
export function getCapacity(buildingType, level) { const capacities = CAPACITY_PER_LEVEL[buildingType] || CAPACITY_PER_LEVEL.mine; return capacities[level - 1] || capacities[capacities.length - 1]; }
export function getUpgradeCost(buildingType, nextLevel) { if (nextLevel < 2 || nextLevel > 5) return null; const cost = UPGRADE_COSTS[buildingType]?.[nextLevel]; if (!cost) return null; if (buildingType === 'mine') { return { stone: cost[0], wood: cost[1] }; } else { return { gold: cost[0] }; } }
export function getBuildingName(type) { return BUILDING_TYPES[type]?.name || 'Здание'; }
export function getBuildingIcon(type) { return BUILDING_TYPES[type]?.icon || '🏢'; }
export function getResourceType(type) { return BUILDING_TYPES[type]?.resource || 'gold'; }
export function getResourceEmoji(type) { return BUILDING_TYPES[type]?.resourceEmoji || '💰'; }
export function getTreasuryCapacity(level) { const validLevel = Math.max(1, Math.min(level, TREASURY_CAPACITY_PER_LEVEL.length)); return TREASURY_CAPACITY_PER_LEVEL[validLevel - 1]; }
export function getMaxTreasuryLevel() { return TREASURY_CAPACITY_PER_LEVEL.length; }
export function getTreasuryUpgradeCost(nextLevel) { const cost = TREASURY_UPGRADE_COSTS[nextLevel]; if (!cost) return null; return { jamcoins: cost[0], stone: cost[1], wood: cost[2] }; }
export function getWarehouseCapacity(level) { const validLevel = Math.max(1, Math.min(level, WAREHOUSE_CAPACITY_PER_LEVEL.length)); return WAREHOUSE_CAPACITY_PER_LEVEL[validLevel - 1]; }
export function getMaxWarehouseLevel() { return WAREHOUSE_CAPACITY_PER_LEVEL.length; }
export function getWarehouseUpgradeCost(nextLevel) { const cost = WAREHOUSE_UPGRADE_COSTS[nextLevel]; if (!cost) return null; return { jamcoins: cost[0], stone: cost[1], wood: cost[2] }; }