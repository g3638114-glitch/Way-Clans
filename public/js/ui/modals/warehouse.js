import { appState, updateUI } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { openStorageModal } from './storage.js';
import {
  getWarehouseCapacity,
  getMaxWarehouseLevel,
  getWarehouseUpgradeCost,
} from '../../game/config.js';

/**
 * Open the warehouse modal and render warehouse information
 */
export function openWarehouseModal() {
  renderWarehouseContent();
  document.getElementById('warehouse-modal').classList.add('active');
}

/**
 * Close the warehouse modal
 */
export function closeWarehouseModal() {
  document.getElementById('warehouse-modal').classList.remove('active');
}

/**
 * Render warehouse content (level, resources, progress, upgrade options)
 */
async function renderWarehouseContent() {
  try {
    // Fetch warehouse data from backend
    const result = await apiClient.getWarehouse(appState.userId);
    const warehouse = result.warehouse;

    const currentLevel = warehouse.currentLevel;
    const maxLevel = warehouse.maxLevel;
    const capacity = warehouse.capacity;

    // Update level display
    document.getElementById('warehouse-current-level').textContent = currentLevel;
    document.getElementById('warehouse-max-level').textContent = maxLevel;

    // Update capacity display
    document.getElementById('warehouse-capacity-current').textContent = capacity.toLocaleString('ru-RU');
    document.getElementById('warehouse-capacity-total').textContent = capacity.toLocaleString('ru-RU');

    // Update resource amounts and progress bars
    document.getElementById('warehouse-wood-amount').textContent = (warehouse.wood || 0).toLocaleString('ru-RU');
    document.getElementById('warehouse-wood-progress').style.width = warehouse.woodProgress + '%';

    document.getElementById('warehouse-stone-amount').textContent = (warehouse.stone || 0).toLocaleString('ru-RU');
    document.getElementById('warehouse-stone-progress').style.width = warehouse.stoneProgress + '%';

    document.getElementById('warehouse-meat-amount').textContent = (warehouse.meat || 0).toLocaleString('ru-RU');
    document.getElementById('warehouse-meat-progress').style.width = warehouse.meatProgress + '%';

    // Render upgrade section
    renderWarehouseUpgradeSection(currentLevel, maxLevel, capacity);
  } catch (error) {
    console.error('Error rendering warehouse:', error);
    tg.showAlert(error.message || 'Ошибка при загрузке склада.');
  }
}

/**
 * Render the upgrade section with cost details
 */
function renderWarehouseUpgradeSection(currentLevel, maxLevel, capacity) {
  const upgradeSection = document.getElementById('warehouse-upgrade-section');
  const upgradeBtn = document.getElementById('warehouse-upgrade-btn');

  // Clear previous content
  upgradeSection.innerHTML = '';

  // If at max level, show max level message
  if (currentLevel >= maxLevel) {
    upgradeSection.innerHTML = `
      <div class="upgrade-max-level">
        <p>✅ Максимальный уровень достигнут!</p>
      </div>
    `;
    upgradeBtn.style.display = 'none';
    return;
  }

  // Show next level upgrade info
  const nextLevel = currentLevel + 1;
  const costData = getWarehouseUpgradeCost(nextLevel);
  const nextCapacity = getWarehouseCapacity(nextLevel);

  // Check if player has resources for upgrade
  const hasJamcoins = (appState.currentUser.gold || 0) >= costData.jamcoins;
  const hasStone = (appState.currentUser.stone || 0) >= costData.stone;
  const hasWood = (appState.currentUser.wood || 0) >= costData.wood;
  const canUpgrade = hasJamcoins && hasStone && hasWood;

  upgradeSection.innerHTML = `
    <div class="upgrade-info-section">
      <h4>Улучшение до уровня ${nextLevel}</h4>
      <p class="upgrade-benefit">Вместимость: ${capacity.toLocaleString('ru-RU')} → ${nextCapacity.toLocaleString('ru-RU')}</p>
      
      <div class="upgrade-costs">
        <div class="cost-item ${hasJamcoins ? 'have-resource' : 'lack-resource'}">
          <span class="cost-label">Jamcoin 💰</span>
          <span class="cost-value">${costData.jamcoins}</span>
          <span class="have-value">(есть: ${(appState.currentUser.gold || 0).toLocaleString('ru-RU')})</span>
        </div>
        
        <div class="cost-item ${hasStone ? 'have-resource' : 'lack-resource'}">
          <span class="cost-label">Камень 🪨</span>
          <span class="cost-value">${costData.stone}</span>
          <span class="have-value">(есть: ${(appState.currentUser.stone || 0).toLocaleString('ru-RU')})</span>
        </div>
        
        <div class="cost-item ${hasWood ? 'have-resource' : 'lack-resource'}">
          <span class="cost-label">Дерево 🌲</span>
          <span class="cost-value">${costData.wood}</span>
          <span class="have-value">(есть: ${(appState.currentUser.wood || 0).toLocaleString('ru-RU')})</span>
        </div>
      </div>
    </div>
  `;

  // Show upgrade button if player has enough resources
  upgradeBtn.style.display = canUpgrade ? 'block' : 'none';
  if (!canUpgrade) {
    upgradeBtn.disabled = true;
  } else {
    upgradeBtn.disabled = false;
  }
}

/**
 * Upgrade warehouse to next level
 */
export async function upgradeWarehouseToLevel() {
  try {
    const result = await apiClient.upgradeWarehouse(appState.userId);

    appState.currentUser = result.user;
    updateUI(appState.currentUser);

    renderWarehouseContent();

    tg.showAlert(`✅ Склад улучшен до уровня ${result.newLevel}! Новая вместимость: ${result.newCapacity.toLocaleString('ru-RU')}`);
  } catch (error) {
    tg.showAlert(error.message || 'Ошибка при обновлении склада.');
  }
}

/**
 * Open warehouse sell modal (uses the existing storage/sell modal)
 */
export function openWarehouseSellModal() {
  // Close warehouse modal first
  closeWarehouseModal();

  // Open storage modal which handles resource selling
  openStorageModal();
}
