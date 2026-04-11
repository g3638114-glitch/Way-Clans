// Calculate upgrade cost based on level
export function calculateUpgradeCost(level) {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

// Calculate time remaining until building is full
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

// Update collected amounts for all buildings based on time passed
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

// Building configuration
export const BUILDING_CONFIGS = {
  mine: {
    name: 'Шахта',
    icon: '⛏',
    productionRate: 80,
    cost: 0,
  },
  quarry: {
    name: 'Каменоломня',
    icon: '🪨',
    productionRate: 60,
    cost: 50000,
  },
  lumber_mill: {
    name: 'Лесопилка',
    icon: '🌲',
    productionRate: 50,
    cost: 40000,
  },
  farm: {
    name: 'Ферма',
    icon: '🍖',
    productionRate: 40,
    cost: 30000,
  },
};

// Get building configuration
export function getBuildingConfig(buildingType) {
  return BUILDING_CONFIGS[buildingType] || BUILDING_CONFIGS.mine;
}

// Get building icon
export function getBuildingIcon(type) {
  return BUILDING_CONFIGS[type]?.icon || '🏢';
}

// Get building name
export function getBuildingName(type) {
  return BUILDING_CONFIGS[type]?.name || 'Здание';
}
