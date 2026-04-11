import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { renderBuildings } from '../builders.js';
import { formatNumber } from '../../utils/formatters.js';
import { calculateUpgradeCost, BUILDING_CONFIGS } from '../../game/calculations.js';

export function openUpgradeModal(buildingId, currentLevel) {
  const building = appState.allBuildings.find(b => b.id === buildingId);
  if (!building) return;

  appState.upgradeModalData.buildingId = buildingId;
  appState.upgradeModalData.currentLevel = currentLevel;

  // Update modal content
  const config = BUILDING_CONFIGS[building.building_type];
  const buildingName = `${config.name} #${building.building_number}`;
  document.getElementById('upgrade-building-name').textContent = buildingName;

  // Current level and production
  document.getElementById('upgrade-current-level').textContent = currentLevel;
  document.getElementById('upgrade-new-level').textContent = currentLevel + 1;
  document.getElementById('upgrade-current-production').textContent = building.production_rate;

  // Calculate new production rate (20% increase per level)
  const newProductionRate = Math.floor(building.production_rate * 1.2);
  document.getElementById('upgrade-new-production').textContent = newProductionRate;

  // Cost
  const upgradeCost = calculateUpgradeCost(currentLevel);
  document.getElementById('upgrade-cost-value').textContent = formatNumber(upgradeCost);
  document.getElementById('upgrade-player-gold').textContent = formatNumber(appState.currentUser.gold);

  // Enable/disable upgrade button based on gold
  const upgradeBtn = document.getElementById('upgrade-confirm-btn');
  if (appState.currentUser.gold >= upgradeCost) {
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
    const buildingIndex = appState.allBuildings.findIndex(b => b.id === appState.upgradeModalData.buildingId);
    if (buildingIndex !== -1) {
      appState.allBuildings[buildingIndex] = result.building;
      // Maintain decimal value tracking across upgrades
      if (!appState.allBuildings[buildingIndex]._collected_decimal) {
        appState.allBuildings[buildingIndex]._collected_decimal = 0;
      }
    }

    closeUpgradeModal();
    renderBuildings();
    tg.showAlert(`✅ Building upgraded! New level: ${appState.upgradeModalData.currentLevel + 1}`);
  } catch (error) {
    console.error('Error upgrading building:', error);
    tg.showAlert(error.message || 'Error during upgrade');
  }
}
