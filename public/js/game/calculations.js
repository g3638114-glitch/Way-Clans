import { getBuildingConfig, getBuildingIcon, getBuildingName } from './config.js';

export { getBuildingConfig, getBuildingIcon, getBuildingName };

/**
 * Calculate upgrade cost based on level
 * Formula: 1000 * 1.15^(level-1)
 * @param {number} level - Building level
 * @returns {number} Upgrade cost in gold
 */
export function calculateUpgradeCost(level) {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

/**
 * Calculate time remaining until building is full
 * @param {number} collected - Currently collected amount
 * @param {number} production - Production rate per hour
 * @param {number} capacity - Max capacity of building
 * @returns {string} Human-readable time remaining
 */
export function calculateTimeRemaining(collected, production, capacity) {
  if (production === 0) return 'Н/Д';

  const remaining = capacity - collected;
  const hoursNeeded = remaining / production;

  if (hoursNeeded <= 0) return 'Готово!';
  if (hoursNeeded < 1) {
    const minutes = Math.ceil(hoursNeeded * 60);
    return `${minutes} мин`;
  }
  return `${Math.ceil(hoursNeeded)} ч`;
}

/**
 * Update collected amounts for all buildings based on time passed
 * Maintains decimal precision internally for smooth production
 * @param {array} buildings - Array of building objects
 */
export function updateCollectedAmounts(buildings) {
  const now = new Date();

  buildings.forEach(building => {
    if (!building.last_collected) return;

    const lastCollected = new Date(building.last_collected);
    const hoursPassed = (now - lastCollected) / (1000 * 60 * 60);
    const productionRate = building.production_rate || 100;
    const maxCapacity = productionRate * 24; // 24 hour max capacity

    // Store decimal value internally for smooth calculation
    if (!building._collected_decimal) {
      building._collected_decimal = building.collected_amount || 0;
    }

    const newCollected = building._collected_decimal + (hoursPassed * productionRate);
    building._collected_decimal = Math.min(newCollected, maxCapacity); // Cap at max capacity
  });
}
