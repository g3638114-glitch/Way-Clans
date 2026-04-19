import { appState, withOperationLock } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { renderBuildings } from '../builders.js';
import { formatNumber } from '../../utils/formatters.js';
import { getUpgradeCost, getProductionRate, getBuildingConfig, getBuildingIcon } from '../../game/config.js';
import { getResourceIconHtml, getResourceLabel } from '../../utils/resourceIcons.js';

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
  document.getElementById('upgrade-hero-icon').textContent = getBuildingIcon(building.building_type);
  document.getElementById('upgrade-building-name').textContent = buildingName;
  document.getElementById('upgrade-current-level').textContent = currentLevel;
  document.getElementById('upgrade-new-level').textContent = nextLevel;

  // Current and new production rates
  const currentProduction = getProductionRate(building.building_type, currentLevel);
  const newProduction = getProductionRate(building.building_type, nextLevel);
  const resourceType = config.resource;
  document.getElementById('upgrade-current-production').innerHTML = `${currentProduction}${getResourceIconHtml(resourceType, 'resource-inline-icon', getResourceLabel(resourceType))}/час`;
  document.getElementById('upgrade-new-production').innerHTML = `${newProduction}${getResourceIconHtml(resourceType, 'resource-inline-icon', getResourceLabel(resourceType))}/час`;

  // Get upgrade cost
  const costData = getUpgradeCost(building.building_type, nextLevel);
  const upgradeBtn = document.getElementById('upgrade-confirm-btn');
  const actionStateEl = document.getElementById('upgrade-action-state');

  if (!costData) {
    upgradeBtn.disabled = true;
    document.getElementById('upgrade-modal').classList.add('active');
    return;
  }

  // Update cost display based on building type
  let canAfford = true;
  const costValueEl = document.getElementById('upgrade-cost-value');
  const costItems = [];

  if (building.building_type === 'mine') {
    const hasStone = appState.currentUser.stone >= costData.stone;
    const hasWood = appState.currentUser.wood >= costData.wood;
    canAfford = hasStone && hasWood;

    costItems.push(
      renderCostItem('stone', 'Камень', costData.stone, appState.currentUser.stone || 0, hasStone),
      renderCostItem('wood', 'Дерево', costData.wood, appState.currentUser.wood || 0, hasWood)
    );
  } else {
    const hasGold = appState.currentUser.gold >= costData.gold;
    canAfford = hasGold;
    costItems.push(renderCostItem('gold', 'Jamcoin', costData.gold, appState.currentUser.gold || 0, hasGold));
  }

  costValueEl.innerHTML = costItems.join('');
  actionStateEl.textContent = canAfford ? 'Ресурсов хватает, улучшение доступно' : 'Не хватает ресурсов для улучшения';
  actionStateEl.className = `player-gold-info ${canAfford ? 'upgrade-action-ok' : 'upgrade-action-bad'}`;

  if (canAfford) {
    upgradeBtn.classList.remove('disabled');
    upgradeBtn.disabled = false;
    upgradeBtn.textContent = `Улучшить до ур. ${nextLevel}`;
  } else {
    upgradeBtn.classList.add('disabled');
    upgradeBtn.disabled = true;
    upgradeBtn.textContent = 'Не хватает ресурсов';
  }

  document.getElementById('upgrade-modal').classList.add('active');
}

function renderCostItem(resourceType, label, need, have, isSufficient) {
  return `
    <div class="upgrade-cost-item ${isSufficient ? 'sufficient' : 'insufficient'}">
      <div class="upgrade-cost-item-top">
        <span class="upgrade-cost-resource">${getResourceIconHtml(resourceType, 'resource-inline-icon-lg', label)} ${label}</span>
        <span class="upgrade-cost-status">${isSufficient ? 'Хватает' : 'Не хватает'}</span>
      </div>
      <div class="upgrade-cost-item-values">
        <span class="upgrade-cost-need">Нужно: ${formatNumber(need)}</span>
        <span class="upgrade-cost-have">Есть: ${formatNumber(have)}</span>
      </div>
    </div>
  `;
}

export function closeUpgradeModal() {
  document.getElementById('upgrade-modal').classList.remove('active');
  appState.upgradeModalData = { buildingId: null, currentLevel: null };
}

export async function confirmUpgrade() {
  if (!appState.upgradeModalData.buildingId) return;

  await withOperationLock(`upgradeModal_${appState.upgradeModalData.buildingId}`, async () => {
    try {
      const nextLevel = appState.upgradeModalData.currentLevel + 1;
      const result = await apiClient.upgradeBuilding(appState.userId, appState.upgradeModalData.buildingId);
      appState.currentUser = result.user;
      updateUI(appState.currentUser);

      const buildingIndex = appState.allBuildings.findIndex(
        (b) => b.id === appState.upgradeModalData.buildingId
      );
      if (buildingIndex !== -1) {
        appState.allBuildings[buildingIndex] = result.building;
      }

      closeUpgradeModal();
      renderBuildings();
      showUpgradeResultModal({
        title: 'Здание улучшено',
        icon: getBuildingIcon(result.building.building_type),
        name: getBuildingConfig(result.building.building_type).name,
        newLevel: nextLevel,
        benefitLabel: 'Производство',
        benefitValue: `${getProductionRate(result.building.building_type, nextLevel)}${getResourceIconHtml(getBuildingConfig(result.building.building_type).resource, 'resource-inline-icon', getResourceLabel(getBuildingConfig(result.building.building_type).resource))}/час`,
      });
    } catch (error) {
      console.error('Error upgrading building:', error);
      window.tg.showAlert(error.message || 'Ошибка при улучшении здания');
    }
  });
}

function showUpgradeResultModal({ title, icon, name, newLevel, benefitLabel, benefitValue }) {
  const modal = document.getElementById('game-result-modal');
  const titleEl = document.getElementById('game-result-title');
  const bodyEl = document.getElementById('game-result-body');

  if (!modal || !titleEl || !bodyEl) {
    window.tg.showAlert(`✅ ${name} улучшено до уровня ${newLevel}`);
    return;
  }

  titleEl.textContent = title;
  bodyEl.innerHTML = `
    <div class="target-card attack-result-card attack-result-win">
      <div class="upgrade-result-hero">
        <div class="upgrade-result-icon">${icon}</div>
        <div>
          <div class="target-name" style="margin-bottom:4px;">${name}</div>
          <div class="upgrade-result-level">Теперь уровень ${newLevel}</div>
        </div>
      </div>
      <div class="upgrade-delta-card" style="margin-top: 12px;">
        <div class="upgrade-section-title">Получено улучшение</div>
        <div class="upgrade-delta-row">
          <span class="upgrade-delta-label">${benefitLabel}</span>
          <div class="upgrade-delta-values"><span class="new">${benefitValue}</span></div>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('active');
}
