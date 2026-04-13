import { appState } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { updateUI } from '../ui/dom.js';
import { renderBuildings } from '../ui/builders.js';
import { openUpgradeModal } from '../ui/modals/index.js';
import { getBuildingConfig, getCapacity } from './config.js';

/**
 * Activate a building to start production
 */
export async function activateBuilding(buildingId) {
  try {
    const result = await apiClient.activateBuilding(appState.userId, buildingId);

    // Update building in local array
    const buildingIndex = appState.allBuildings.findIndex((b) => b.id === buildingId);
    if (buildingIndex !== -1) {
      appState.allBuildings[buildingIndex] = result.building;
      appState.allBuildings[buildingIndex].currentAccumulated = 0;
    }

    renderBuildings();

    const config = getBuildingConfig(result.building.building_type);
    window.tg.showAlert(`✅ ${config.name} активирована и начинает производство!`);
  } catch (error) {
    console.error('Error activating building:', error);
    window.tg.showAlert(error.message || 'Ошибка при активировании здания');
  }
}

/**
 * Collect resources from a building (when at full capacity)
 */
export async function collectResources(buildingId) {
  try {
    const result = await apiClient.collectResources(appState.userId, buildingId);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    // Update building in local array
    const buildingIndex = appState.allBuildings.findIndex((b) => b.id === buildingId);
    if (buildingIndex !== -1) {
      appState.allBuildings[buildingIndex] = result.building;
      appState.allBuildings[buildingIndex].currentAccumulated = 0;
    }

    renderBuildings();

    const config = getBuildingConfig(result.building.building_type);
    const emoji = config.resourceEmoji;
    window.tg.showAlert(
      `✅ Собрано ${result.collectedAmount}${emoji}! Здание перезагрузилось.`
    );
  } catch (error) {
    console.error('Error collecting resources:', error);
    window.tg.showAlert(error.message || 'Ошибка при сборе ресурсов');
  }
}

/**
 * Upgrade building - opens modal with cost details
 */
export function upgradeBuilding(buildingId) {
  // Find the building to get its current level
  const building = appState.allBuildings.find((b) => b.id === buildingId);
  if (building) {
    openUpgradeModal(buildingId, building.level || 1);
  }
}

/**
 * Confirm upgrade after modal
 */
export async function confirmUpgradeBuilding(buildingId) {
  try {
    const result = await apiClient.upgradeBuilding(appState.userId, buildingId);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    // Update building in local array
    const buildingIndex = appState.allBuildings.findIndex((b) => b.id === buildingId);
    if (buildingIndex !== -1) {
      appState.allBuildings[buildingIndex] = result.building;
    }

    renderBuildings();

    const config = getBuildingConfig(result.building.building_type);
    window.tg.showAlert(
      `⬆️ ${config.name} улучшена до уровня ${result.building.level}!`
    );
  } catch (error) {
    console.error('Error upgrading building:', error);
    window.tg.showAlert(error.message || 'Ошибка при улучшении здания');
  }
}
