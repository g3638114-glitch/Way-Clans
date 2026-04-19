import { getWarrior, getAllWarriors, getWarriorLevel, formatCost } from '../game/warriors.js';
import { appState } from '../utils/state.js';
import { formatNumberShort, formatNumber } from '../utils/formatters.js';
import { apiClient } from '../api/client.js';
import { withOperationLock } from '../utils/state.js';
import { getResourceIconHtml } from '../utils/resourceIcons.js';

/**
 * Show warrior card for a specific warrior type
 */
export function showWarriorCard(warriorId) {
  const warrior = getWarrior(warriorId);
  if (!warrior) return;

  // Update active button
  document.querySelectorAll('.btn-warrior').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-warrior="${warriorId}"]`)?.classList.add('active');

  // Render warrior card
  renderWarriorCard(warrior);
}

/**
 * Show "My Warriors" section
 */
export function showMyWarriors() {
  // Update active button
  document.querySelectorAll('.btn-warrior').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector('[data-warrior="my-warriors"]')?.classList.add('active');

  // Render my warriors
  renderMyWarriors();
}

/**
 * Render a single warrior card
 */
function renderWarriorCard(warrior) {
  const container = document.getElementById('warrior-card-container');
  if (!container) return;

  // Get current level from user data (default to 1 if not found)
  const currentLevel = appState.currentUser?.warrior_levels?.[warrior.id] || 0;
  const nextLevel = currentLevel + 1;
  const currentLevelData = getWarriorLevel(warrior.id, Math.max(1, currentLevel));
  const nextLevelData = getWarriorLevel(warrior.id, nextLevel);

  // Check if warrior is maxed out
  const isMaxed = currentLevel >= warrior.levels.length;

  // Build HTML
  let html = `
    <div class="warrior-card">
      <div class="warrior-card-header">
        <div class="warrior-card-icon">${warrior.icon}</div>
        <div class="warrior-card-info">
          <h3 class="warrior-card-title">${warrior.name}</h3>
          <p class="warrior-card-description">${warrior.description}</p>
        </div>
      </div>

      <div class="warrior-stats">
        <div class="warrior-stat-row warrior-level-display">
          <div class="level-badge">
            <div class="level-label">Текущий уровень</div>
            <div class="level-value">${currentLevel}</div>
          </div>
  `;

  if (!isMaxed) {
    html += `
          <div class="level-arrow">→</div>
          <div class="level-badge">
            <div class="level-label">Следующий уровень</div>
            <div class="level-value">${nextLevel}</div>
          </div>
    `;
  }

  html += `
        </div>

        <div class="warrior-stat-row">
          <span class="warrior-stat-label">Урон:</span>
          <span class="warrior-stat-value">${currentLevelData ? currentLevelData.damage : 0}`;

  if (!isMaxed && nextLevelData) {
    html += ` → ${nextLevelData.damage}`;
  }

  html += `</span>
        </div>

        <div class="warrior-stat-row">
          <span class="warrior-stat-label">Здоровье:</span>
          <span class="warrior-stat-value">${currentLevelData ? currentLevelData.health : 0}`;

  if (!isMaxed && nextLevelData) {
    html += ` → ${nextLevelData.health}`;
  }

  html += `</span>
        </div>
  `;

  // Show loot for Attacker warriors
  if (warrior.id === 'attacker' && currentLevelData && currentLevelData.loot) {
    html += `
      <div class="warrior-loot-section">
        <div class="loot-title">1 Атакующий крадёт:</div>
        <div class="loot-items">
          <div class="loot-item">${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')} ${currentLevelData.loot.gold}</div>
          <div class="loot-item">${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')} ${currentLevelData.loot.wood}</div>
          <div class="loot-item">${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')} ${currentLevelData.loot.stone}</div>
          <div class="loot-item">${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')} ${currentLevelData.loot.meat}</div>
        </div>
      </div>
    `;
  }

  html += `
      </div>
  `;

  // Show hire cost
  html += `
      <div class="hire-cost-section">
        <div class="hire-cost-title">Стоимость найма одного воина</div>
        <div class="hire-cost-items">
          <div class="hire-cost-item ${hasEnoughResources('hire', warrior) ? '' : 'insufficient'}">
            ${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')} ${formatNumber(warrior.hireCost.gold)}
          </div>
          <div class="hire-cost-item ${hasEnoughResources('hire', warrior) ? '' : 'insufficient'}">
            ${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')} ${warrior.hireCost.wood}
          </div>
          <div class="hire-cost-item ${hasEnoughResources('hire', warrior) ? '' : 'insufficient'}">
            ${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')} ${warrior.hireCost.stone}
          </div>
          <div class="hire-cost-item ${hasEnoughResources('hire', warrior) ? '' : 'insufficient'}">
            ${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')} ${warrior.hireCost.meat}
          </div>
        </div>
      </div>
  `;

  // Show upgrade cost (if not maxed)
  if (!isMaxed && nextLevelData && nextLevelData.upgradeCost) {
    html += `
      <div class="upgrade-cost-section">
        <div class="upgrade-cost-title">Стоимость улучшения с уровня ${currentLevel} на ${nextLevel}</div>
        <div class="upgrade-cost-items">
    `;

    const upgradeCost = nextLevelData.upgradeCost;
    if (upgradeCost.gold) {
      const hasGold = appState.currentUser?.gold >= upgradeCost.gold;
      html += `<div class="cost-item ${hasGold ? '' : 'insufficient'}">${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')} ${formatNumber(upgradeCost.gold)}</div>`;
    }
    if (upgradeCost.jabcoin) {
      const hasJabcoin = appState.currentUser?.jabcoins >= upgradeCost.jabcoin;
      html += `<div class="cost-item ${hasJabcoin ? '' : 'insufficient'}">${getResourceIconHtml('jabcoin', 'resource-inline-icon', 'Jabcoin')} ${upgradeCost.jabcoin}</div>`;
    }
    if (upgradeCost.meat) {
      const hasMeat = appState.currentUser?.meat >= upgradeCost.meat;
      html += `<div class="cost-item ${hasMeat ? '' : 'insufficient'}">${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')} ${upgradeCost.meat}</div>`;
    }

    html += `
        </div>
      </div>
    `;
  }

  // Action buttons
  html += `
      <div class="warrior-card-actions">
  `;

  if (!isMaxed) {
    const canUpgrade = hasEnoughResources('upgrade', warrior, nextLevelData);
    html += `
      <button class="btn-warrior-action btn-upgrade-warrior" 
              onclick="upgradeWarrior('${warrior.id}')"
              ${!canUpgrade ? 'disabled' : ''}>
        ⬆️ Улучшить до ${nextLevel}
      </button>
    `;
  } else {
    html += `
      <button class="btn-warrior-action btn-maxed-warrior" disabled>
        ✨ Максимальный уровень
      </button>
    `;
  }

  const canHire = hasEnoughResources('hire', warrior);
  html += `
      <button class="btn-warrior-action btn-hire-warrior" 
              onclick="hireWarrior('${warrior.id}')"
              ${!canHire ? 'disabled' : ''}>
        👤 Нанять воина
      </button>
  `;

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Render "My Warriors" section showing current warrior counts
 */
function renderMyWarriors() {
  const container = document.getElementById('warrior-card-container');
  if (!container) return;

  const warriors = getAllWarriors();
  const warriorCounts = appState.currentUser?.warrior_counts || {};

  let html = '<div class="my-warriors-container">';

  const hasAnyWarriors = warriors.some(w => (warriorCounts[w.id] || 0) > 0);

  if (!hasAnyWarriors) {
    html += '<div class="no-warriors-message">У вас нет воинов. Начните нанимать их, нажав на тип воина.</div>';
  } else {
    warriors.forEach(warrior => {
      const count = warriorCounts[warrior.id] || 0;
      const level = appState.currentUser?.warrior_levels?.[warrior.id] || 0;

      html += `
        <div class="warrior-count-item">
          <div class="warrior-count-info">
            <div class="warrior-count-icon">${warrior.icon}</div>
            <div class="warrior-count-details">
              <p class="warrior-count-name">${warrior.name}</p>
              <p class="warrior-count-level">Уровень: ${level}</p>
            </div>
          </div>
          <div class="warrior-count-number">${count}</div>
        </div>
      `;
    });
  }

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Check if player has enough resources for an operation
 */
function hasEnoughResources(operation, warrior, upgradeLevelData = null) {
  const user = appState.currentUser;
  if (!user) return false;

  if (operation === 'hire') {
    const cost = warrior.hireCost;
    return user.gold >= cost.gold &&
           user.wood >= cost.wood &&
           user.stone >= cost.stone &&
           user.meat >= cost.meat;
  }

  if (operation === 'upgrade' && upgradeLevelData && upgradeLevelData.upgradeCost) {
    const cost = upgradeLevelData.upgradeCost;
    if (cost.gold && user.gold < cost.gold) return false;
    if (cost.jabcoin && user.jabcoins < cost.jabcoin) return false;
    if (cost.meat && user.meat < cost.meat) return false;
    return true;
  }

  return false;
}

/**
 * Upgrade a warrior (to be called from HTML onclick)
 */
window.upgradeWarrior = async function(warriorId) {
  const warrior = getWarrior(warriorId);
  if (!warrior) return;

  await withOperationLock(`upgradeWarrior-${warriorId}`, async () => {
    try {
      const result = await apiClient.upgradeWarrior(appState.userId, warriorId);

      if (result.user) {
        appState.currentUser = result.user;
        // Update UI
        const { updateUI } = await import('./dom.js');
        updateUI(appState.currentUser);
        // Re-render the warrior card
        showWarriorCard(warriorId);
        tg.showAlert('✅ Воин успешно улучшен!');
      }
    } catch (error) {
      console.error('Error upgrading warrior:', error);
      tg.showAlert('❌ ' + (error.message || 'Ошибка при улучшении воина'));
    }
  });
};

/**
 * Hire a warrior (to be called from HTML onclick)
 */
window.hireWarrior = async function(warriorId) {
  const warrior = getWarrior(warriorId);
  if (!warrior) return;

  await withOperationLock(`hireWarrior-${warriorId}`, async () => {
    try {
      const result = await apiClient.hireWarrior(appState.userId, warriorId);

      if (result.user) {
        appState.currentUser = result.user;
        // Update UI
        const { updateUI } = await import('./dom.js');
        updateUI(appState.currentUser);
        // Re-render the warrior card
        showWarriorCard(warriorId);
        tg.showAlert('✅ Воин успешно нанят!');
      }
    } catch (error) {
      console.error('Error hiring warrior:', error);
      tg.showAlert('❌ ' + (error.message || 'Ошибка при найме воина'));
    }
  });
};

/**
 * Initialize barracks page (show first warrior by default)
 */
export function initializeBarracks() {
  showWarriorCard('attacker');
}
