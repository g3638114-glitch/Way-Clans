import { appState } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { updateUI } from '../ui/dom.js';
import { renderBuildings } from '../ui/builders.js';
import { openUpgradeModal } from '../ui/modals/index.js';
import { getBuildingConfig, getCapacity } from './config.js';

/**
 * Activate a building to start production
 * Prevents double-click by disabling button during request
 */
export async function activateBuilding(buildingId) {
  const card = document.querySelector(`[data-building-id="${buildingId}"]`);
  const activateBtn = card?.querySelector('.btn-activate');

  if (activateBtn) {
    activateBtn.disabled = true;
    activateBtn.classList.add('btn-loading');
    const originalText = activateBtn.textContent;
    activateBtn.textContent = '⏳ Загрузка...';

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

      // Re-enable button on error
      activateBtn.disabled = false;
      activateBtn.classList.remove('btn-loading');
      activateBtn.textContent = originalText;
    }
  } else {
    // Fallback if button not found
    try {
      const result = await apiClient.activateBuilding(appState.userId, buildingId);

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
}

/**
 * Collect resources from a building (when at full capacity)
 * Prevents double-click by disabling button during request
 */
export async function collectResources(buildingId) {
  // Find the button and disable it to prevent double-click
  const card = document.querySelector(`[data-building-id="${buildingId}"]`);
  const collectBtn = card?.querySelector('.btn-collect');

  if (collectBtn) {
    collectBtn.disabled = true;
    collectBtn.classList.add('btn-loading');
    const originalText = collectBtn.innerHTML;
    collectBtn.innerHTML = '<span>⏳ Загрузка...</span>';

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

      // Re-enable button on error
      collectBtn.disabled = false;
      collectBtn.classList.remove('btn-loading');
      collectBtn.innerHTML = originalText;
    }
  } else {
    // Fallback if button not found
    try {
      const result = await apiClient.collectResources(appState.userId, buildingId);
      appState.currentUser = result.user;
      updateUI(appState.currentUser);

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
 * Prevents double-click by disabling button during request
 */
export async function confirmUpgradeBuilding(buildingId) {
  // Find and disable the confirm button
  const confirmBtn = document.querySelector('[data-upgrade-confirm]');

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.classList.add('btn-loading');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = '⏳ Загрузка...';

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

      // Re-enable button on error
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('btn-loading');
      confirmBtn.textContent = originalText;
    }
  } else {
    // Fallback if button not found
    try {
      const result = await apiClient.upgradeBuilding(appState.userId, buildingId);
      appState.currentUser = result.user;
      updateUI(appState.currentUser);

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
}
