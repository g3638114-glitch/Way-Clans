import { appState, withOperationLock } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { updateUI } from '../ui/dom.js';
import { renderBuildings } from '../ui/builders.js';
import { openUpgradeModal } from '../ui/modals/index.js';
import { getBuildingConfig, MINE_AD_WORKERS, MINE_MEAT_COST, MINE_MEAT_WORKERS, MINE_SHIFT_HOURS } from './config.js';
import { getResourceIconHtml, getResourceLabel } from '../utils/resourceIcons.js';
import { getAdsgramBlockId, showRewardedAd } from '../services/adsgram.js';

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
 * Collect resources from a building
 */
export async function collectResources(buildingId, rewardMultiplier = 1) {
  const lockKey = rewardMultiplier > 1 ? `collectResourcesX2_${buildingId}` : `collectResources_${buildingId}`;
  await withOperationLock(lockKey, async () => {
    try {
      const result = rewardMultiplier > 1
        ? await collectResourcesWithBoost(buildingId)
        : await apiClient.collectResources(appState.userId, buildingId);
      appState.currentUser = result.user;
      updateUI(appState.currentUser);

      // Update building in local array
      const buildingIndex = appState.allBuildings.findIndex((b) => b.id === buildingId);
      if (buildingIndex !== -1) {
        appState.allBuildings[buildingIndex] = result.building;
        appState.allBuildings[buildingIndex].currentAccumulated = result.remainingAmount || 0;
      }

      renderBuildings();

      const config = getBuildingConfig(result.building.building_type);
      renderCollectionResultModal({
        buildingName: config.name,
        resourceType: config.resource,
        collectedAmount: result.collectedAmount,
        partialCollection: result.partialCollection,
        remainingAmount: result.remainingAmount,
        rewardMultiplier,
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

async function collectResourcesWithBoost(buildingId) {
  const session = await apiClient.collectResourcesX2(appState.userId, buildingId);
  const adShown = await showRewardedAd(getAdsgramBlockId('building'));
  if (!adShown) {
    throw new Error('Реклама не была просмотрена полностью. Сбор x2 не выполнен.');
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await apiClient.finalizeCollectResourcesX2(appState.userId, buildingId, session.sessionId);
    } catch (error) {
      if (!String(error.message || '').includes('ещё не подтверждена') || attempt === 4) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  throw new Error('Не удалось подтвердить рекламную награду');
}

async function finalizeAdAction(finalizer) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await finalizer();
    } catch (error) {
      if (!String(error.message || '').includes('ещё не подтверждена') || attempt === 4) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  throw new Error('Не удалось подтвердить рекламную награду');
}

export async function speedUpBuildingProduction(buildingId) {
  await withOperationLock(`speedUpBuilding_${buildingId}`, async () => {
    try {
      const session = await apiClient.speedUpBuilding(appState.userId, buildingId);
      const adShown = await showRewardedAd(getAdsgramBlockId('building'));
      if (!adShown) {
        window.tg.showAlert('Реклама не была просмотрена полностью. Бонус за 1 час не применён.');
        return;
      }

      const result = await finalizeAdAction(() => apiClient.finalizeSpeedUpBuilding(appState.userId, buildingId, session.sessionId));
      updateBuildingState(result.building, result.afterAmount);
      renderBuildings();
      const config = getBuildingConfig(result.building.building_type);
      renderSpeedUpResultModal({
        buildingName: config.name,
        resourceType: config.resource,
        beforeAmount: result.beforeAmount,
        addedAmount: result.addedAmount,
        afterAmount: result.afterAmount,
        capacity: result.capacity,
      });
    } catch (error) {
      window.tg.showAlert(error.message || 'Ошибка при начислении ресурсов за 1 час');
    }
  });
}

export async function startMineWorkers(buildingId, mode) {
  await withOperationLock(`startMineWorkers_${buildingId}`, async () => {
    try {
      if (mode === 'ad_300') {
        const adShown = await showRewardedAd(getAdsgramBlockId('building'));
        if (!adShown) {
          window.tg.showAlert('Реклама не была просмотрена полностью. Рабочие не наняты.');
          return;
        }
      }

      const result = await apiClient.startMineWorkers(appState.userId, buildingId, mode);
      appState.currentUser = result.user;
      updateUI(appState.currentUser);
      updateBuildingState(result.building);
      renderBuildings();

      const workers = mode === 'ad_300' ? MINE_AD_WORKERS : MINE_MEAT_WORKERS;
      window.tg.showAlert(`✅ В шахту отправлены ${workers} рабочих на ${MINE_SHIFT_HOURS} час.`);
    } catch (error) {
      window.tg.showAlert(error.message || 'Ошибка при запуске шахты');
    }
  });
}

export async function finishMineWorkNow(buildingId) {
  await withOperationLock(`finishMineWorkNow_${buildingId}`, async () => {
    try {
      const session = await apiClient.finishMineWorkNow(appState.userId, buildingId);
      const adShown = await showRewardedAd(getAdsgramBlockId('building'));
      if (!adShown) {
        window.tg.showAlert('Реклама не была просмотрена полностью. Мгновенный сбор не выполнен.');
        return;
      }

      const result = await finalizeAdAction(() => apiClient.finalizeMineWorkNow(appState.userId, buildingId, session.sessionId));
      updateBuildingState(result.building);
      renderBuildings();
      window.tg.showAlert('✅ Работа шахты завершена мгновенно с x2. Теперь можно собрать Jamcoin.');
    } catch (error) {
      window.tg.showAlert(error.message || 'Ошибка при мгновенном завершении работы');
    }
  });
}

function updateBuildingState(building, overrideCurrentAccumulated = null) {
  const buildingIndex = appState.allBuildings.findIndex((b) => b.id === building.id);
  if (buildingIndex !== -1) {
    appState.allBuildings[buildingIndex] = {
      ...appState.allBuildings[buildingIndex],
      ...building,
      currentAccumulated: overrideCurrentAccumulated !== null
        ? Number(overrideCurrentAccumulated || 0)
        : Number(building.collected_amount || building.currentAccumulated || 0),
      mineShiftActive: Boolean(building.worker_count && building.work_ends_at && new Date(building.work_ends_at) > new Date()),
      mineWorkerCount: Number(building.worker_count || 0),
      mineWorkEndsAt: building.work_ends_at || null,
      work_started_at: building.work_started_at || null,
      work_ends_at: building.work_ends_at || null,
      worker_count: Number(building.worker_count || 0),
    };
  }
}

function renderSpeedUpResultModal({ buildingName, resourceType, beforeAmount, addedAmount, afterAmount, capacity }) {
  const modal = document.getElementById('game-result-modal');
  const title = document.getElementById('game-result-title');
  const body = document.getElementById('game-result-body');

  if (!modal || !title || !body) {
    window.tg.showAlert(`Добавлены ресурсы за 1 час. Было: ${beforeAmount}, стало: ${afterAmount}.`);
    return;
  }

  title.textContent = 'Бонус За 1 Час';
  body.innerHTML = `
    <div class="target-card">
      <div class="target-name">${buildingName}</div>
      <div class="target-defenders">
        <div class="soldier-item" style="border-left-color: #ffb347; display:block;">
          <div style="font-weight:700; margin-bottom:6px;">Реклама сразу добавила ресурсы за 1 час производства</div>
          <div style="display:grid; gap:8px; color:#fff;">
            <div>Было: <strong>${beforeAmount}</strong> ${getResourceLabel(resourceType)}</div>
            <div>Добавлено за 1 час: <strong style="color:#ffd166;">+${addedAmount}</strong> ${getResourceLabel(resourceType)}</div>
            <div>Стало: <strong>${afterAmount}</strong> из ${capacity} ${getResourceLabel(resourceType)}</div>
          </div>
          <div style="margin-top:10px; color:#8fe39c; font-weight:700;">${afterAmount >= capacity ? 'Лимит заполнен' : 'Ресурсы за 1 час начислены'}</div>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function renderCollectionResultModal({ buildingName, resourceType, collectedAmount, partialCollection = false, remainingAmount = 0, rewardMultiplier = 1 }) {
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
          ${rewardMultiplier > 1 ? `<div style="margin-top:8px; color:#8fe39c; font-weight:700;">Бонус x${rewardMultiplier} применён</div>` : ''}
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
