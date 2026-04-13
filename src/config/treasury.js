/**
 * Treasury Configuration System
 * Easily modifiable parameters for treasury levels, limits, and upgrade costs
 * Add new levels by simply adding entries to the arrays below
 */

// ============================================================================
// TREASURY LEVEL LIMITS (Jamcoin storage capacity per level)
// Level 1 is the initial level (no upgrade cost)
// To add a new level, just append a new value to this array
// ============================================================================
export const TREASURY_LIMITS = [
  31250,     // Level 1 - initial
  62500,     // Level 2
  125000,    // Level 3
  250000,    // Level 4
  500000,    // Level 5
  1000000,   // Level 6
];

// ============================================================================
// TREASURY UPGRADE COSTS
// Format: { jamcoin, stone, wood } for each level upgrade
// Level 1->2 costs are at index 1, Level 2->3 costs are at index 2, etc.
// ============================================================================
export const TREASURY_UPGRADE_COSTS = [
  null,  // No cost for level 1 (initial level)
  { jamcoin: 625, stone: 625, wood: 625 },      // Level 1->2
  { jamcoin: 1250, stone: 1250, wood: 1250 },   // Level 2->3
  { jamcoin: 2500, stone: 2500, wood: 2500 },   // Level 3->4
  { jamcoin: 5000, stone: 5000, wood: 5000 },   // Level 4->5
  { jamcoin: 10000, stone: 10000, wood: 10000 }, // Level 5->6
];

// ============================================================================
// TREASURY METADATA
// ============================================================================
export const TREASURY_CONFIG = {
  name: 'Казна',
  icon: '💎',
  resource: 'jamcoin',
  resourceEmoji: '💎',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get treasury limit for a specific level
 * @param {number} level - Treasury level (1-based)
 * @returns {number} Storage limit in Jamcoins
 */
export function getTreasuryLimit(level) {
  if (level < 1 || level > TREASURY_LIMITS.length) {
    return TREASURY_LIMITS[TREASURY_LIMITS.length - 1];
  }
  return TREASURY_LIMITS[level - 1];
}

/**
 * Get upgrade cost for treasury
 * @param {number} currentLevel - Current treasury level
 * @returns {object|null} Cost object {jamcoin, stone, wood} or null if at max level
 */
export function getTreasuryUpgradeCost(currentLevel) {
  const nextLevel = currentLevel + 1;
  
  if (nextLevel > TREASURY_UPGRADE_COSTS.length) {
    return null; // Already at max level
  }
  
  return TREASURY_UPGRADE_COSTS[nextLevel - 1];
}

/**
 * Get max treasury level
 * @returns {number} Maximum treasury level
 */
export function getMaxTreasuryLevel() {
  return TREASURY_LIMITS.length;
}

/**
 * Check if treasury is at max level
 * @param {number} level - Current treasury level
 * @returns {boolean} True if at max level
 */
export function isMaxTreasuryLevel(level) {
  return level >= getMaxTreasuryLevel();
}

/**
 * Get treasury config metadata
 * @returns {object} Treasury metadata
 */
export function getTreasuryConfig() {
  return TREASURY_CONFIG;
}
