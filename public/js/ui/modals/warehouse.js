import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { getMaxWarehouseLevel, getWarehouseCapacity, getWarehouseUpgradeCost } from '../../game/config.js';

export function openWarehouseModal() {
  renderWarehouseContent();
  document.getElementById('warehouse-modal').classList.add('active');
}

export function closeWarehouseModal() {
  document.getElementById('warehouse-modal').classList.remove('active');
}

export function openWarehouseSellModal() {
  updateWarehouseSellDisplay();
  document.getElementById('warehouse-sell-modal').classList.add('active');
}

export function closeWarehouseSellModal() {
  document.getElementById('warehouse-sell-modal').classList.remove('active');
  resetWarehouseSellInputs();
}

function resetWarehouseSellInputs() {
  document.getElementById('warehouse-wood-input').value = '';
  document.getElementById('warehouse-stone-input').value = '';
  document.getElementById('warehouse-meat-input').value = '';
}

function updateWarehouseSellDisplay() {
  document.getElementById('warehouse-sell-wood').textContent = appState.currentUser.wood;
  document.getElementById('warehouse-sell-stone').textContent = appState.currentUser.stone;
  document.getElementById('warehouse-sell-meat').textContent = appState.currentUser.meat;
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
    document.getElementById('warehouse-current-level').textContent = currentLevel;
    document.getElementById('warehouse-max-level').textContent = maxLevel;
    document.getElementById('warehouse-capacity-current').textContent = capacity;
    document.getElementById('warehouse-capacity-total').textContent = capacity;

    // Update resource displays
    document.getElementById('warehouse-wood-current').textContent = warehouse.currentWood;
    document.getElementById('warehouse-wood-total').textContent = capacity;
    document.getElementById('warehouse-wood-fill').style.width = `${warehouse.progress.wood}%`;

    document.getElementById('warehouse-stone-current').textContent = warehouse.currentStone;
    document.getElementById('warehouse-stone-total').textContent = capacity;
    document.getElementById('warehouse-stone-fill').style.width = `${warehouse.progress.stone}%`;

    document.getElementById('warehouse-meat-current').textContent = warehouse.currentMeat;
    document.getElementById('warehouse-meat-total').textContent = capacity;
    document.getElementById('warehouse-meat-fill').style.width = `${warehouse.progress.meat}%`;

    // Render upgrade section
    if (!isMaxed) {
      const upgradeHtml = renderWarehouseUpgradeInfo(currentLevel, warehouse);
      document.getElementById('warehouse-upgrade-section').innerHTML = upgradeHtml;

      // Show upgrade button and manage its state
      const upgradeBtn = document.getElementById('warehouse-upgrade-btn');
      const nextLevel = currentLevel + 1;
      const costData = getWarehouseUpgradeCost(nextLevel);

      const hasJamcoins = (appState.currentUser.gold || 0) >= costData.jamcoins;
      const hasStone = (appState.currentUser.stone || 0) >= costData.stone;
      const hasWood = (appState.currentUser.wood || 0) >= costData.wood;
      const canUpgrade = hasJamcoins && hasStone && hasWood;

      upgradeBtn.style.display = 'block';
      upgradeBtn.disabled = !canUpgrade;
      upgradeBtn.className = canUpgrade ? 'btn btn-primary' : 'btn btn-primary disabled';
    } else {
      document.getElementById('warehouse-upgrade-section').innerHTML = `
        <div class="max-level-reached">
          <div class="max-badge">🌟 Максимальный уровень</div>
          <p>Ваш Склад достигнул максимального уровня ${maxLevel}</p>
        </div>
      `;

      // Hide upgrade button
      const upgradeBtn = document.getElementById('warehouse-upgrade-btn');
      upgradeBtn.style.display = 'none';
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
  const canUpgrade = hasJamcoins && hasStone && hasWood;

  return `
    <div class="upgrade-building-info">
      <div class="upgrade-stats-row">
        <div class="upgrade-stat-item">
          <span class="stat-label">Текущий уровень</span>
          <span class="stat-value">${currentLevel}</span>
        </div>
        <div class="upgrade-stat-item arrow-separator">→</div>
        <div class="upgrade-stat-item">
          <span class="stat-label">Следующий уровень</span>
          <span class="stat-value">${nextLevel}</span>
        </div>
      </div>

      <div class="upgrade-production-info">
        <div class="production-row">
          <span>Вместимость ресурса</span>
          <div class="production-values">
            <span class="current">${currentCapacity}</span>
            <span class="arrow">→</span>
            <span class="new">${nextCapacity}</span>
          </div>
        </div>
      </div>

      <div class="upgrade-cost-section">
        <h3>Стоимость улучшения</h3>
        <div class="cost-items-row">
          <div class="cost-item-upgrade ${hasJamcoins ? 'sufficient' : 'insufficient'}">
            <span class="cost-value">${costData.jamcoins}</span>
            <span class="cost-icon">💰</span>
          </div>
          <div class="cost-item-upgrade ${hasStone ? 'sufficient' : 'insufficient'}">
            <span class="cost-value">${costData.stone}</span>
            <span class="cost-icon">🪨</span>
          </div>
          <div class="cost-item-upgrade ${hasWood ? 'sufficient' : 'insufficient'}">
            <span class="cost-value">${costData.wood}</span>
            <span class="cost-icon">🌲</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function upgradeWarehouseToLevel() {
  try {
    const result = await apiClient.upgradeWarehouse(appState.userId);

    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    // Re-render warehouse content
    renderWarehouseContent();

    tg.showAlert(`✅ Склад улучшен до уровня ${result.newLevel}! Новая вместимость: ${result.newCapacity}`);
  } catch (error) {
    console.error('Error upgrading warehouse:', error);
    tg.showAlert(error.message || 'Ошибка при обновлении склада.');
  }
}

export async function sellWarehouseResources() {
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
}
