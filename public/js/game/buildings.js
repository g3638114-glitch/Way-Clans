import { appState } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { updateUI } from '../ui/dom.js';
import { renderBuildings } from '../ui/builders.js';
import { openUpgradeModal } from '../ui/modals/index.js';
import { BUILDING_CONFIGS } from './calculations.js';

// Collect resources from building
export async function collectResources(buildingId) {
  try {
    const result = await apiClient.collectResources(appState.userId, buildingId);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    // Update building in local array
    const buildingIndex = appState.allBuildings.findIndex(b => b.id === buildingId);
    if (buildingIndex !== -1) {
      appState.allBuildings[buildingIndex] = result.building;
      // Reset decimal tracker
      appState.allBuildings[buildingIndex]._collected_decimal = 0;
    }

    renderBuildings();
    tg.showAlert(`✅ Собрано ${Math.floor(result.collected)} ресурсов!`);
  } catch (error) {
    console.error('Error collecting resources:', error);
    tg.showAlert(error.message || 'Ошибка при сборе ресурсов');
  }
}

// Purchase a building
export async function purchaseBuilding(buildingType) {
  try {
    const result = await apiClient.purchaseBuilding(appState.userId, buildingType);
    appState.currentUser = result.user;
    appState.allBuildings.push(result.building);

    // Initialize decimal tracker for new building
    result.building._collected_decimal = 0;

    updateUI(appState.currentUser);
    renderBuildings();

    const buildingName = BUILDING_CONFIGS[buildingType].name;
    tg.showAlert(`✅ ${buildingName} #1 куплена!`);
  } catch (error) {
    console.error('Error purchasing building:', error);
    tg.showAlert(error.message || 'Ошибка при покупке здания');
  }
}

// Upgrade building - opens modal instead of confirm dialog
export function upgradeBuilding(buildingId, currentLevel) {
  openUpgradeModal(buildingId, currentLevel);
}
