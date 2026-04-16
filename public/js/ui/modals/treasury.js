import { appState, withOperationLock } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { getMaxTreasuryLevel, getTreasuryCapacity, getTreasuryUpgradeCost } from '../../game/config.js';
import { getResourceIconHtml } from '../../utils/resourceIcons.js';

export function openTreasuryModal() {
  renderTreasuryContent();
  document.getElementById('treasury-modal').classList.add('active');
}

export function closeTreasuryModal() {
  document.getElementById('treasury-modal').classList.remove('active');
}

async function renderTreasuryContent() {
  try {
    const result = await apiClient.getTreasury(appState.userId);
    const treasury = result.treasury;

    const maxLevel = getMaxTreasuryLevel();
    const currentLevel = treasury.currentLevel;
    const currentCapacity = treasury.capacity;
    const currentJamcoins = treasury.currentJamcoins;
    const isMaxed = currentLevel === maxLevel;

    // Update header info
    document.getElementById('treasury-current-level').textContent = currentLevel;
    document.getElementById('treasury-max-level').textContent = maxLevel;
    document.getElementById('treasury-capacity-current').textContent = currentJamcoins;
    document.getElementById('treasury-capacity-total').textContent = currentCapacity;
    document.getElementById('treasury-progress-fill').style.width = `${treasury.progress}%`;

    // Render upgrade section
    if (!isMaxed) {
      const upgradeHtml = renderUpgradeInfo(currentLevel, currentJamcoins);
      document.getElementById('treasury-upgrade-section').innerHTML = upgradeHtml;

      // Show upgrade button and manage its state
      const upgradeBtn = document.getElementById('treasury-upgrade-btn');
      const nextLevel = currentLevel + 1;
      const costData = getTreasuryUpgradeCost(nextLevel);

      const hasJamcoins = (appState.currentUser.gold || 0) >= costData.jamcoins;
      const hasStone = (appState.currentUser.stone || 0) >= costData.stone;
      const hasWood = (appState.currentUser.wood || 0) >= costData.wood;
      const canUpgrade = hasJamcoins && hasStone && hasWood;

      upgradeBtn.style.display = 'block';
      upgradeBtn.disabled = !canUpgrade;
      upgradeBtn.className = canUpgrade ? 'btn btn-primary' : 'btn btn-primary disabled';
    } else {
      document.getElementById('treasury-upgrade-section').innerHTML = `
        <div class="max-level-reached">
          <div class="max-badge">🌟 Максимальный уровень</div>
          <p>Ваша Казна достигла максимального уровня ${maxLevel}</p>
        </div>
      `;

      // Hide upgrade button
      const upgradeBtn = document.getElementById('treasury-upgrade-btn');
      upgradeBtn.style.display = 'none';
    }

  } catch (error) {
    console.error('Error loading treasury data:', error);
    tg.showAlert(error.message || 'Ошибка при загрузке казначейских данных.');
  }
}

function renderUpgradeInfo(currentLevel, currentJamcoins) {
  const nextLevel = currentLevel + 1;
  const currentCapacity = getTreasuryCapacity(currentLevel);
  const nextCapacity = getTreasuryCapacity(nextLevel);
  const costData = getTreasuryUpgradeCost(nextLevel);

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
          <span>Вместимость</span>
          <div class="production-values">
            <span class="current">${currentCapacity} ${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}</span>
            <span class="arrow">→</span>
            <span class="new">${nextCapacity} ${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}</span>
          </div>
        </div>
      </div>

      <div class="upgrade-cost-section">
        <h3>Стоимость улучшения</h3>
        <div class="cost-items-row">
          <div class="cost-item-upgrade ${hasJamcoins ? 'sufficient' : 'insufficient'}">
            <span class="cost-value">${costData.jamcoins}</span>
            <span class="cost-icon">${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}</span>
          </div>
          <div class="cost-item-upgrade ${hasStone ? 'sufficient' : 'insufficient'}">
            <span class="cost-value">${costData.stone}</span>
            <span class="cost-icon">${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}</span>
          </div>
          <div class="cost-item-upgrade ${hasWood ? 'sufficient' : 'insufficient'}">
            <span class="cost-value">${costData.wood}</span>
            <span class="cost-icon">${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}


export async function upgradeTreasuryToLevel() {
  await withOperationLock('upgradeTreasury', async () => {
    try {
      const result = await apiClient.upgradeTreasury(appState.userId);

      appState.currentUser = result.user;
      updateUI(appState.currentUser);

      renderTreasuryContent();

      tg.showAlert(`✅ Казна улучшена до уровня ${result.newLevel}! Новая вместимость: ${result.newCapacity}`);
    } catch (error) {
      console.error('Error upgrading treasury:', error);
      tg.showAlert(error.message || 'Ошибка при обновлении казначейства.');
    }
  });
}
