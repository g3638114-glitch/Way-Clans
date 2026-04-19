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
  return `
    <div class="upgrade-building-info">
      <div class="upgrade-building-name upgrade-building-hero">
        <div class="upgrade-hero-icon">🏰</div>
        <div class="upgrade-hero-copy">
          <div class="upgrade-hero-kicker">Улучшение казны</div>
          <div class="upgrade-hero-title">Казна клана</div>
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
          <span class="upgrade-delta-label">Вместимость</span>
          <div class="upgrade-delta-values">
            <span class="current">${currentCapacity} ${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}</span>
            <span class="arrow">→</span>
            <span class="new">${nextCapacity} ${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}</span>
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
