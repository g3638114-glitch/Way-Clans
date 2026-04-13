import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { getMaxTreasuryLevel, getTreasuryCapacity, getTreasuryUpgradeCost } from '../../game/config.js';

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
    
    // Render treasury info
    const infoHtml = `
      <div class="treasury-info">
        <div class="treasury-level-display">
          <h3>Уровень: ${currentLevel} / ${maxLevel}</h3>
          <p class="capacity-info">Вместимость: ${currentJamcoins} / ${currentCapacity} 💰</p>
        </div>
        <div class="treasury-progress-bar">
          <div class="progress-fill" style="width: ${treasury.progress}%"></div>
        </div>
      </div>
    `;
    
    document.getElementById('treasury-info').innerHTML = infoHtml;
    
    // Render upgrade levels
    const levelsHtml = renderLevelsList(currentLevel, maxLevel, currentJamcoins);
    document.getElementById('treasury-levels').innerHTML = levelsHtml;
    
  } catch (error) {
    console.error('Error loading treasury data:', error);
    tg.showAlert(error.message || 'Error loading treasury data');
  }
}

function renderLevelsList(currentLevel, maxLevel, currentJamcoins) {
  let html = '';
  
  for (let level = 1; level <= maxLevel; level++) {
    const capacity = getTreasuryCapacity(level);
    const isCurrentLevel = level === currentLevel;
    const isMaxLevel = level === maxLevel;
    
    if (level === 1) {
      // Level 1 is free
      html += `
        <div class="level-card ${isCurrentLevel ? 'current' : ''}">
          <div class="level-header">
            <span class="level-number">Уровень ${level}</span>
            ${isCurrentLevel ? '<span class="current-badge">Текущий</span>' : ''}
          </div>
          <div class="capacity-info">Вместимость: ${capacity} 💰</div>
          <div class="cost-info">Стоимость: Бесплатно</div>
        </div>
      `;
    } else if (isMaxLevel) {
      // Max level
      html += `
        <div class="level-card ${isCurrentLevel ? 'current' : 'locked'}">
          <div class="level-header">
            <span class="level-number">Уровень ${level}</span>
            ${isCurrentLevel ? '<span class="current-badge">Текущий</span>' : ''}
          </div>
          <div class="capacity-info">Вместимость: ${capacity} 💰</div>
          ${!isCurrentLevel ? renderUpgradeCost(level) : '<div class="max-level-badge">🌟 Максимальный уровень</div>'}
        </div>
      `;
    } else {
      // Regular levels
      html += `
        <div class="level-card ${isCurrentLevel ? 'current' : ''}">
          <div class="level-header">
            <span class="level-number">Уровень ${level}</span>
            ${isCurrentLevel ? '<span class="current-badge">Текущий</span>' : ''}
          </div>
          <div class="capacity-info">Вместимость: ${capacity} 💰</div>
          ${!isCurrentLevel ? renderUpgradeCost(level) : ''}
        </div>
      `;
    }
  }
  
  return html;
}

function renderUpgradeCost(level) {
  const costData = getTreasuryUpgradeCost(level);
  if (!costData) return '';
  
  const user = appState.currentUser;
  const hasJamcoins = (user.jabcoins || 0) >= costData.jamcoins;
  const hasStone = (user.stone || 0) >= costData.stone;
  const hasWood = (user.wood || 0) >= costData.wood;
  
  const canUpgrade = hasJamcoins && hasStone && hasWood;
  
  return `
    <div class="cost-info">
      <div class="cost-row ${hasJamcoins ? 'sufficient' : 'insufficient'}">
        <span>${costData.jamcoins}</span>
        <span>💰</span>
      </div>
      <div class="cost-row ${hasStone ? 'sufficient' : 'insufficient'}">
        <span>${costData.stone}</span>
        <span>🪨</span>
      </div>
      <div class="cost-row ${hasWood ? 'sufficient' : 'insufficient'}">
        <span>${costData.wood}</span>
        <span>🌲</span>
      </div>
    </div>
    <button class="btn btn-upgrade-level ${canUpgrade ? '' : 'disabled'}" 
            onclick="upgradeTreasuryToLevel(${level})" 
            ${canUpgrade ? '' : 'disabled'}>
      Улучшить до ${level}
    </button>
  `;
}

export async function upgradeTreasuryToLevel(targetLevel) {
  try {
    const result = await apiClient.upgradeTreasury(appState.userId);
    
    appState.currentUser = result.user;
    updateUI(appState.currentUser);
    
    // Re-render treasury content
    renderTreasuryContent();
    
    tg.showAlert(`✅ Казна улучшена до уровня ${result.newLevel}! Новая вместимость: ${result.newCapacity}`);
  } catch (error) {
    console.error('Error upgrading treasury:', error);
    tg.showAlert(error.message || 'Error upgrading treasury');
  }
}
