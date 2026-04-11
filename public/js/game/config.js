/**
 * Building Configuration
 * Defines all building types, their properties, production rates, and icons
 */
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

/**
 * Get building configuration by type
 * @param {string} buildingType - Type of building
 * @returns {object} Building configuration
 */
export function getBuildingConfig(buildingType) {
  return BUILDING_CONFIGS[buildingType] || BUILDING_CONFIGS.mine;
}

/**
 * Get building icon by type
 * @param {string} type - Building type
 * @returns {string} Building icon emoji
 */
export function getBuildingIcon(type) {
  return BUILDING_CONFIGS[type]?.icon || '🏢';
}

/**
 * Get building name by type
 * @param {string} type - Building type
 * @returns {string} Building name
 */
export function getBuildingName(type) {
  return BUILDING_CONFIGS[type]?.name || 'Здание';
}
