import { appState, withOperationLock } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { updateUI } from '../ui/dom.js';
import { renderBuildings } from '../ui/builders.js';
import { openUpgradeModal } from '../ui/modals/index.js';
import { getBuildingConfig, getCapacity } from './config.js';
import { getResourceIconHtml, getResourceLabel } from '../utils/resourceIcons.js';
import { showRewardAd } from '../utils/adsgram.js';

/**
 * Activate a building to start production
 */
export async function activateBuilding(buildingId) {
  await withOperationLock(`activateBuilding_${buildingId}`, async () => {
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

      // Remove focus from button to reset its appearance
      document.activeElement.blur();

      window.tg.showAlert(error.message || 'Ошибка при активировании здания');
    }
  });
}

/**
 * Collect resources from a building (when at full capacity)
 */
export async function collectResources(buildingId) {
  await withOperationLock(`collectResources_${buildingId}`, async () => {
    try {
      try {
        await showRewardAd('buildingCollect');
      } catch (adError) {
        window.tg.showAlert('Просмотрите рекламу, чтобы собрать ресурсы.');
        return;
      }

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
      renderCollectionResultModal({
        buildingName: config.name,
        resourceType: config.resource,
        collectedAmount: result.collectedAmount,
        partialCollection: result.partialCollection,
        remainingAmount: result.remainingAmount,
      });
    } catch (error) {
      console.error('Error collecting resources:', error);

      // Remove focus from button to reset its appearance
      document.activeElement.blur();

      if (error.message.includes('Лимит казны') || error.message.includes('Лимит склада')) {
        window.tg.showAlert(error.message);
        return;
      }

      window.tg.showAlert(error.message || 'Ошибка при сборе ресурсов');
    }
  });
}

function renderCollectionResultModal({ buildingName, resourceType, collectedAmount, partialCollection = false, remainingAmount = 0 }) {
  const modal = document.getElementById('game-result-modal');
  const title = document.getElementById('game-result-title');
  const body = document.getElementById('game-result-body');

  if (!modal || !title || !body) {
    window.tg.showAlert(`Собрано ${collectedAmount} ${getResourceLabel(resourceType)}!`);
    return;
  }

  title.textContent = 'Сбор ресурсов';
  body.innerHTML = `
    <div class="target-card">
      <div class="target-name">${buildingName}</div>
      <div class="target-defenders">
        <div class="soldier-item" style="border-left-color: #4caf50; display:block;">
          <div style="font-weight:700; margin-bottom:6px;">Ресурсы собраны успешно</div>
          <div style="display:flex; align-items:center; gap:10px; font-weight:700; color:#fff;">
            <span>${getResourceIconHtml(resourceType, 'resource-inline-icon-lg', getResourceLabel(resourceType))}</span>
            <span>${collectedAmount} ${getResourceLabel(resourceType)}</span>
          </div>
          ${partialCollection ? `<div style="margin-top:8px; color: rgba(255,255,255,0.7);">В здании осталось: ${remainingAmount} ${getResourceLabel(resourceType)}</div>` : ''}
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

export function closeGameResultModal() {
  document.getElementById('game-result-modal')?.classList.remove('active');
}

window.closeGameResultModal = closeGameResultModal;

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
  await withOperationLock(`upgradeBuilding_${buildingId}`, async () => {
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

      // Remove focus from button to reset its appearance
      document.activeElement.blur();

      window.tg.showAlert(error.message || 'Ошибка при улучшении здания');
    }
  });
}
