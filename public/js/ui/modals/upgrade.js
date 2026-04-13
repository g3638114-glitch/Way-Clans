import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { renderBuildings } from '../builders.js';
import { formatNumber } from '../../utils/formatters.js';
import { getUpgradeCost, getProductionRate, getBuildingConfig } from '../../game/config.js';

export function openUpgradeModal(buildingId, currentLevel) {
  const building = appState.allBuildings.find((b) => b.id === buildingId);
  if (!building) return;

  // Can't upgrade beyond level 5
  if (currentLevel >= 5) {
    window.tg.showAlert('Здание уже на максимальном уровне (5)');
    return;
  }

  appState.upgradeModalData.buildingId = buildingId;
  appState.upgradeModalData.currentLevel = currentLevel;

  const nextLevel = currentLevel + 1;
  const config = getBuildingConfig(building.building_type);
  const buildingName = `${config.name}`;

  // Update modal content
  document.getElementById('upgrade-building-name').textContent = buildingName;
  document.getElementById('upgrade-current-level').textContent = currentLevel;
  document.getElementById('upgrade-new-level').textContent = nextLevel;

  // Current and new production rates
  const currentProduction = getProductionRate(building.building_type, currentLevel);
  const newProduction = getProductionRate(building.building_type, nextLevel);
  const resourceEmoji = config.resourceEmoji;

  document.getElementById('upgrade-current-production').textContent = `${currentProduction}${resourceEmoji}/час`;
  document.getElementById('upgrade-new-production').textContent = `${newProduction}${resourceEmoji}/час`;

  // Get upgrade cost
  const costData = getUpgradeCost(building.building_type, nextLevel);
  const upgradeBtn = document.getElementById('upgrade-confirm-btn');

  if (!costData) {
    upgradeBtn.disabled = true;
    document.getElementById('upgrade-modal').classList.add('active');
    return;
  }

  // Update cost display based on building type
  let canAfford = true;
  const costValueEl = document.getElementById('upgrade-cost-value');
  const costIconEl = document.querySelector('.cost-icon');
  const playerGoldInfoEl = document.querySelector('.player-gold-info');

  if (building.building_type === 'mine') {
    // Mine costs stone + wood
    const hasStone = appState.currentUser.stone >= costData.stone;
    const hasWood = appState.currentUser.wood >= costData.wood;
    canAfford = hasStone && hasWood;

    costValueEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">
          <span>Камень:</span>
          <span style="color: ${!hasStone ? '#ff6b6b' : '#d4af37'}; font-weight: bold;">
            ${formatNumber(costData.stone)} / ${formatNumber(appState.currentUser.stone || 0)}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">
          <span>Дерево:</span>
          <span style="color: ${!hasWood ? '#ff6b6b' : '#d4af37'}; font-weight: bold;">
            ${formatNumber(costData.wood)} / ${formatNumber(appState.currentUser.wood || 0)}
          </span>
        </div>
      </div>
    `;
    if (costIconEl) costIconEl.style.display = 'none';
    playerGoldInfoEl.textContent = '';
  } else {
    // Others cost gold
    const hasGold = appState.currentUser.gold >= costData.gold;
    canAfford = hasGold;

    costValueEl.textContent = formatNumber(costData.gold);
    costValueEl.style.color = hasGold ? '#d4af37' : '#ff6b6b';
    if (costIconEl) {
      costIconEl.style.display = 'inline';
      costIconEl.textContent = '💰';
    }
    playerGoldInfoEl.innerHTML = `Ваши Jamcoins: <span style="color: #d4af37; font-weight: bold;">${formatNumber(appState.currentUser.gold)} 💰</span>`;
  }

  // Enable/disable upgrade button
  if (canAfford) {
    upgradeBtn.classList.remove('disabled');
    upgradeBtn.disabled = false;
  } else {
    upgradeBtn.classList.add('disabled');
    upgradeBtn.disabled = true;
  }

  document.getElementById('upgrade-modal').classList.add('active');
}

export function closeUpgradeModal() {
  document.getElementById('upgrade-modal').classList.remove('active');
  appState.upgradeModalData = { buildingId: null, currentLevel: null };
}

export async function confirmUpgrade() {
  if (!appState.upgradeModalData.buildingId) return;

  try {
    const result = await apiClient.upgradeBuilding(appState.userId, appState.upgradeModalData.buildingId);
    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    // Update building in local array
    const buildingIndex = appState.allBuildings.findIndex(
      (b) => b.id === appState.upgradeModalData.buildingId
    );
    if (buildingIndex !== -1) {
      appState.allBuildings[buildingIndex] = result.building;
    }

    closeUpgradeModal();
    renderBuildings();
    window.tg.showAlert(
      `✅ Здание улучшено! Новый уровень: ${appState.upgradeModalData.currentLevel + 1}`
    );
  } catch (error) {
    console.error('Error upgrading building:', error);
    window.tg.showAlert(error.message || 'Ошибка при улучшении здания');
  }
}
