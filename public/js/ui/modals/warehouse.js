import { appState, withOperationLock } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { getMaxWarehouseLevel, getWarehouseCapacity, getWarehouseUpgradeCost } from '../../game/config.js';
import { updateWarehouseSellModal } from '../../game/market.js';
import { getResourceIconHtml } from '../../utils/resourceIcons.js';

export function openWarehouseModal() {
  renderWarehouseContent();
  document.getElementById('warehouse-modal').classList.add('active');
}

export function closeWarehouseModal() {
  document.getElementById('warehouse-modal').classList.remove('active');
}

export function openWarehouseSellModal() {
  updateWarehouseSellDisplay();
  updateWarehouseSellModal(); // Update with market module data
  document.getElementById('warehouse-sell-modal').classList.add('active');
}

export function closeWarehouseSellModal() {
  document.getElementById('warehouse-sell-modal').classList.remove('active');
}


function updateWarehouseSellDisplay() {
  const woodEl = document.getElementById('warehouse-sell-wood-amount');
  const stoneEl = document.getElementById('warehouse-sell-stone-amount');
  const meatEl = document.getElementById('warehouse-sell-meat-amount');

  if (woodEl) woodEl.textContent = appState.currentUser.wood;
  if (stoneEl) stoneEl.textContent = appState.currentUser.stone;
  if (meatEl) meatEl.textContent = appState.currentUser.meat;
}

export function setMaxWarehouseWood() {
  document.getElementById('warehouse-wood-input').value = appState.currentUser.wood;
}

export function setMaxWarehouseStone() {
  document.getElementById('warehouse-stone-input').value = appState.currentUser.stone;
}

export function setMaxWarehouseMeat() {
  document.getElementById('warehouse-meat-input').value = appState.currentUser.meat;
}

async function renderWarehouseContent() {
  try {
    const result = await apiClient.getWarehouse(appState.userId);
    const warehouse = result.warehouse;

    const maxLevel = getMaxWarehouseLevel();
    const currentLevel = warehouse.currentLevel;
    const capacity = warehouse.capacity;
    const isMaxed = currentLevel === maxLevel;

    // Update header info
    const headerLevel = document.getElementById('warehouse-current-level');
    const maxLevelEl = document.getElementById('warehouse-max-level');
    const capacityCurrent = document.getElementById('warehouse-capacity-current');
    const capacityTotal = document.getElementById('warehouse-capacity-total');

    if (headerLevel) headerLevel.textContent = currentLevel;
    if (maxLevelEl) maxLevelEl.textContent = maxLevel;
    if (capacityCurrent) capacityCurrent.textContent = capacity;
    if (capacityTotal) capacityTotal.textContent = capacity;

    // Update resource displays
    const woodCurrent = document.getElementById('warehouse-wood-current');
    const woodTotal = document.getElementById('warehouse-wood-total');
    const woodFill = document.getElementById('warehouse-wood-fill');

    if (woodCurrent) woodCurrent.textContent = warehouse.currentWood;
    if (woodTotal) woodTotal.textContent = capacity;
    if (woodFill) woodFill.style.width = `${warehouse.progress.wood}%`;

    const stoneCurrent = document.getElementById('warehouse-stone-current');
    const stoneTotal = document.getElementById('warehouse-stone-total');
    const stoneFill = document.getElementById('warehouse-stone-fill');

    if (stoneCurrent) stoneCurrent.textContent = warehouse.currentStone;
    if (stoneTotal) stoneTotal.textContent = capacity;
    if (stoneFill) stoneFill.style.width = `${warehouse.progress.stone}%`;

    const meatCurrent = document.getElementById('warehouse-meat-current');
    const meatTotal = document.getElementById('warehouse-meat-total');
    const meatFill = document.getElementById('warehouse-meat-fill');

    if (meatCurrent) meatCurrent.textContent = warehouse.currentMeat;
    if (meatTotal) meatTotal.textContent = capacity;
    if (meatFill) meatFill.style.width = `${warehouse.progress.meat}%`;

    // Render upgrade section
    const upgradeSectionEl = document.getElementById('warehouse-upgrade-section');
    if (upgradeSectionEl && !isMaxed) {
      const upgradeHtml = renderWarehouseUpgradeInfo(currentLevel, warehouse);
      upgradeSectionEl.innerHTML = upgradeHtml;

      // Show upgrade button and manage its state
      const upgradeBtn = document.getElementById('warehouse-upgrade-btn');
      if (upgradeBtn) {
        const nextLevel = currentLevel + 1;
        const costData = getWarehouseUpgradeCost(nextLevel);

        const hasJamcoins = (appState.currentUser.gold || 0) >= costData.jamcoins;
        const hasStone = (appState.currentUser.stone || 0) >= costData.stone;
        const hasWood = (appState.currentUser.wood || 0) >= costData.wood;
        const canUpgrade = hasJamcoins && hasStone && hasWood;

        upgradeBtn.style.display = 'block';
        upgradeBtn.disabled = !canUpgrade;
        upgradeBtn.className = canUpgrade ? 'btn btn-primary' : 'btn btn-primary disabled';
      }
    } else if (upgradeSectionEl) {
      upgradeSectionEl.innerHTML = `
        <div class="max-level-reached">
          <div class="max-badge">🌟 Максимальный уровень</div>
          <p>Ваш Склад достигнул максимального уровня ${maxLevel}</p>
        </div>
      `;

      // Hide upgrade button
      const upgradeBtn = document.getElementById('warehouse-upgrade-btn');
      if (upgradeBtn) upgradeBtn.style.display = 'none';
    }

  } catch (error) {
    console.error('Error loading warehouse data:', error);
    tg.showAlert(error.message || 'Ошибка при загрузке данных склада.');
  }
}

function renderWarehouseUpgradeInfo(currentLevel, warehouse) {
  const nextLevel = currentLevel + 1;
  const currentCapacity = getWarehouseCapacity(currentLevel);
  const nextCapacity = getWarehouseCapacity(nextLevel);
  const costData = getWarehouseUpgradeCost(nextLevel);

  const user = appState.currentUser;
  const hasJamcoins = (user.gold || 0) >= costData.jamcoins;
  const hasStone = (user.stone || 0) >= costData.stone;
  const hasWood = (user.wood || 0) >= costData.wood;
  return `
    <div class="upgrade-building-info">
      <div class="upgrade-building-name upgrade-building-hero">
        <div class="upgrade-hero-icon">🏭</div>
        <div class="upgrade-hero-copy">
          <div class="upgrade-hero-kicker">Улучшение склада</div>
          <div class="upgrade-hero-title">Склад ресурсов</div>
        </div>
      </div>

      <div class="upgrade-level-hero">
        <div class="upgrade-level-card">
          <span class="upgrade-level-label">Сейчас</span>
          <span class="upgrade-level-value">Ур. ${currentLevel}</span>
        </div>
        <div class="upgrade-level-arrow">→</div>
        <div class="upgrade-level-card upgrade-level-card-next">
          <span class="upgrade-level-label">После улучшения</span>
          <span class="upgrade-level-value">Ур. ${nextLevel}</span>
        </div>
      </div>

      <div class="upgrade-delta-card">
        <div class="upgrade-section-title">Что улучшится</div>
        <div class="upgrade-delta-row">
          <span class="upgrade-delta-label">Вместимость ресурса</span>
          <div class="upgrade-delta-values">
            <span class="current">${currentCapacity}</span>
            <span class="arrow">→</span>
            <span class="new">${nextCapacity}</span>
          </div>
        </div>
      </div>

      <div class="upgrade-cost-section upgrade-cost-shell">
        <div class="upgrade-section-title">Нужно для улучшения</div>
        <div class="upgrade-cost-grid">
          ${renderCostItem('gold', 'Jamcoin', costData.jamcoins, user.gold || 0, hasJamcoins)}
          ${renderCostItem('stone', 'Камень', costData.stone, user.stone || 0, hasStone)}
          ${renderCostItem('wood', 'Дерево', costData.wood, user.wood || 0, hasWood)}
        </div>
        <p class="player-gold-info ${hasJamcoins && hasStone && hasWood ? 'upgrade-action-ok' : 'upgrade-action-bad'}">${hasJamcoins && hasStone && hasWood ? 'Ресурсов хватает, улучшение доступно' : 'Не хватает ресурсов для улучшения'}</p>
      </div>
    </div>
  `;
}

function renderCostItem(resourceType, label, need, have, isSufficient) {
  return `
    <div class="upgrade-cost-item ${isSufficient ? 'sufficient' : 'insufficient'}">
      <div class="upgrade-cost-item-top">
        <span class="upgrade-cost-resource">${getResourceIconHtml(resourceType, 'resource-inline-icon-lg', label)} ${label}</span>
        <span class="upgrade-cost-status">${isSufficient ? 'Хватает' : 'Не хватает'}</span>
      </div>
      <div class="upgrade-cost-item-values">
        <span class="upgrade-cost-need">Нужно: ${need}</span>
        <span class="upgrade-cost-have">Есть: ${have}</span>
      </div>
    </div>
  `;
}

export async function upgradeWarehouseToLevel() {
  await withOperationLock('upgradeWarehouse', async () => {
    try {
      const result = await apiClient.upgradeWarehouse(appState.userId);

      appState.currentUser = result.user;
      updateUI(appState.currentUser);

      // Re-render warehouse content
      renderWarehouseContent();

      showUpgradeResultModal({
        title: 'Склад улучшен',
        icon: '🏭',
        name: 'Склад ресурсов',
        newLevel: result.newLevel,
        benefitLabel: 'Вместимость ресурса',
        benefitValue: `${result.newCapacity}`,
      });
    } catch (error) {
      console.error('Error upgrading warehouse:', error);
      tg.showAlert(error.message || 'Ошибка при обновлении склада.');
    }
  });
}

function showUpgradeResultModal({ title, icon, name, newLevel, benefitLabel, benefitValue }) {
  const modal = document.getElementById('game-result-modal');
  const titleEl = document.getElementById('game-result-title');
  const bodyEl = document.getElementById('game-result-body');

  if (!modal || !titleEl || !bodyEl) {
    tg.showAlert(`✅ ${name} улучшен до уровня ${newLevel}`);
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

export async function sellWarehouseResources() {
  await withOperationLock('sellWarehouseResources', async () => {
    try {
      const wood = parseInt(document.getElementById('warehouse-wood-input').value) || 0;
      const stone = parseInt(document.getElementById('warehouse-stone-input').value) || 0;
      const meat = parseInt(document.getElementById('warehouse-meat-input').value) || 0;

      if (wood === 0 && stone === 0 && meat === 0) {
        tg.showAlert('Выберите ресурсы для продажи');
        return;
      }

      const result = await apiClient.sellResources(appState.userId, { wood, stone, meat });
      appState.currentUser = result.user;
      updateUI(appState.currentUser);
      closeWarehouseSellModal();
      tg.showAlert('✅ Ресурсы успешно проданы!');
    } catch (error) {
      console.error('Error selling resources:', error);

      // Handle warehouse full error separately - show as notification, not error
      if (error.message.includes('Warehouse is full')) {
        tg.showAlert('🏭 Склад переполнен! Продайте ресурсы, чтобы продолжить сбор.');
        return;
      }

      tg.showAlert(error.message || 'Ошибка при продаже ресурсов');
    }
  });
}
