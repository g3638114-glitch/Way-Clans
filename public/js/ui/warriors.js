import { appState } from '../utils/state.js';
import {
  WARRIOR_TYPES,
  getWarriorLevelData,
  getWarriorLevels,
  getRecruitmentCost,
  canAffordCost,
  formatCostDisplay,
} from '../game/warriors.js';
import { formatNumber } from '../utils/formatters.js';

/**
 * Render warrior level cards for the current warrior type
 */
export function renderWarriorLevels() {
  const container = document.getElementById('warrior-levels-container');
  if (!container) return;

  const warriorType = appState.selectedWarriorType || WARRIOR_TYPES.ATTACKER;
  const levels = getWarriorLevels(warriorType);

  let html = '';

  if (warriorType === 'my-warriors') {
    // Show owned warriors
    html = renderMyWarriors();
  } else {
    // Show all levels for the selected warrior type
    levels.forEach(levelData => {
      html += renderWarriorLevelCard(warriorType, levelData);
    });
  }

  container.innerHTML = html;

  // Add event listeners to warrior cards
  document.querySelectorAll('.warrior-level-card').forEach(card => {
    card.addEventListener('click', handleWarriorCardClick);
  });
}

/**
 * Render a single warrior level card
 */
function renderWarriorLevelCard(type, levelData) {
  const user = appState.currentUser;
  const recruitmentCost = getRecruitmentCost(type);
  const canRecruit = canAffordCost(user, recruitmentCost);

  const isMaxLevel = levelData.level === getWarriorLevels(type).length;

  const typeLabel = type === WARRIOR_TYPES.ATTACKER ? 'Атакующий' : 'Защищающий';
  const typeEmoji = type === WARRIOR_TYPES.ATTACKER ? '⚔️' : '🛡️';

  const warriorCount = getWarriorCountByLevel(type, levelData.level);

  const badgeHtml = isMaxLevel
    ? '<span class="warrior-level-badge max-level">MAX</span>'
    : `<span class="warrior-level-badge">Уровень ${levelData.level}</span>`;

  const statusHtml = warriorCount > 0
    ? `<span class="warrior-action-indicator">✓ Есть в наличии</span>`
    : 'Нажмите, чтобы нанять';

  const countHtml = warriorCount > 0
    ? `<span class="warrior-count">${warriorCount} шт</span>`
    : '';

  return `
    <div class="warrior-level-card ${!canRecruit && warriorCount === 0 ? 'locked' : ''}" data-type="${type}" data-level="${levelData.level}">
      <div class="warrior-card-header">
        <div class="warrior-card-title">${typeEmoji} ${typeLabel} Уровень ${levelData.level}</div>
        ${badgeHtml}
      </div>

      <div class="warrior-card-body">
        <div class="stat-item">
          <span class="stat-item-label">Урон</span>
          <span class="stat-item-value">${formatNumber(levelData.damage)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-item-label">Здоровье</span>
          <span class="stat-item-value">${formatNumber(levelData.hp)}</span>
        </div>
      </div>

      <div class="warrior-card-footer">
        <span class="warrior-status">
          ${statusHtml}
        </span>
        ${countHtml}
      </div>
    </div>
  `;
}

/**
 * Render "My Warriors" tab showing owned warriors
 */
function renderMyWarriors() {
  const attackers = appState.warriors.attackers || [];
  const defenders = appState.warriors.defenders || [];

  if (attackers.length === 0 && defenders.length === 0) {
    return `
      <div style="padding: 40px 15px; text-align: center; color: rgba(255, 255, 255, 0.6);">
        <p style="font-size: 14px; margin: 0;">У вас нет воинов.</p>
        <p style="font-size: 12px; margin: 10px 0 0 0; opacity: 0.7;">Нанимайте воинов в других вкладках</p>
      </div>
    `;
  }

  let html = '';

  if (attackers.length > 0) {
    html += '<div style="margin-bottom: 20px;"><h3 style="font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255, 255, 255, 0.8);">⚔️ Атакующие</h3>';
    attackers.forEach(warrior => {
      html += renderOwnedWarriorCard(WARRIOR_TYPES.ATTACKER, warrior);
    });
    html += '</div>';
  }

  if (defenders.length > 0) {
    html += '<div><h3 style="font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255, 255, 255, 0.8);">🛡️ Защищающие</h3>';
    defenders.forEach(warrior => {
      html += renderOwnedWarriorCard(WARRIOR_TYPES.DEFENDER, warrior);
    });
    html += '</div>';
  }

  return html;
}

/**
 * Render an owned warrior card with stats and level
 */
function renderOwnedWarriorCard(type, warrior) {
  const levelData = getWarriorLevelData(type, warrior.level);
  if (!levelData) return '';

  const typeLabel = type === WARRIOR_TYPES.ATTACKER ? 'Атакующий' : 'Защищающий';
  const typeEmoji = type === WARRIOR_TYPES.ATTACKER ? '⚔️' : '🛡️';

  return `
    <div class="warrior-level-card" style="cursor: pointer; background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(55, 107, 55, 0.15) 100%); border-color: rgba(76, 175, 80, 0.5);" data-warrior-id="${warrior.id}" data-type="${type}" data-level="${warrior.level}">
      <div class="warrior-card-header">
        <div class="warrior-card-title">${typeEmoji} ${typeLabel} ID: ${warrior.id.substring(0, 8)}...</div>
        <span class="warrior-level-badge" style="background: rgba(76, 175, 80, 0.3); border-color: rgba(76, 175, 80, 0.6); color: #4caf50;">Уровень ${warrior.level}</span>
      </div>

      <div class="warrior-card-body">
        <div class="stat-item" style="background: rgba(76, 175, 80, 0.1); border-color: rgba(76, 175, 80, 0.3);">
          <span class="stat-item-label">Урон</span>
          <span class="stat-item-value" style="color: #4caf50;">${formatNumber(levelData.damage)}</span>
        </div>
        <div class="stat-item" style="background: rgba(76, 175, 80, 0.1); border-color: rgba(76, 175, 80, 0.3);">
          <span class="stat-item-label">Здоровье</span>
          <span class="stat-item-value" style="color: #4caf50;">${formatNumber(levelData.hp)}</span>
        </div>
      </div>

      <div class="warrior-card-footer">
        <span class="warrior-status" style="color: rgba(76, 175, 80, 0.8);">✓ Принадлежит вам</span>
        <span class="warrior-action-indicator">Нажмите для улучшения</span>
      </div>
    </div>
  `;
}

/**
 * Handle warrior card click - open modal
 */
function handleWarriorCardClick(event) {
  const card = event.currentTarget;
  const type = card.getAttribute('data-type');
  const level = parseInt(card.getAttribute('data-level'));
  const warriorId = card.getAttribute('data-warrior-id');

  appState.selectedWarriorType = type;
  appState.selectedWarriorId = warriorId;

  openWarriorModal(type, level);
}

/**
 * Open warrior modal with stats and upgrade options
 */
export function openWarriorModal(type, level) {
  const levelData = getWarriorLevelData(type, level);
  if (!levelData) return;

  const modal = document.getElementById('warrior-modal');
  const user = appState.currentUser;
  const levels = getWarriorLevels(type);
  const isMaxLevel = level === levels.length;

  // Set title
  const typeLabel = type === WARRIOR_TYPES.ATTACKER ? 'Атакующий' : 'Защищающий';
  const typeEmoji = type === WARRIOR_TYPES.ATTACKER ? '⚔️' : '🛡️';
  document.getElementById('warrior-modal-title').textContent = `${typeEmoji} ${typeLabel}`;

  // Set level
  document.getElementById('warrior-modal-level').textContent = level;

  // Set stats
  document.getElementById('warrior-modal-damage').textContent = formatNumber(levelData.damage);
  document.getElementById('warrior-modal-hp').textContent = formatNumber(levelData.hp);

  // Show/hide production section
  const productionSection = document.getElementById('warrior-production-section');
  if (type === WARRIOR_TYPES.ATTACKER && levelData.production) {
    productionSection.style.display = 'block';
    document.getElementById('warrior-prod-jamcoin').textContent = formatNumber(levelData.production.jamcoin);
    document.getElementById('warrior-prod-wood').textContent = formatNumber(levelData.production.wood);
    document.getElementById('warrior-prod-stone').textContent = formatNumber(levelData.production.stone);
    document.getElementById('warrior-prod-meat').textContent = formatNumber(levelData.production.meat);
  } else {
    productionSection.style.display = 'none';
  }

  // Set upgrade section
  const upgradeSection = document.getElementById('warrior-upgrade-section');
  const maxLevelSection = document.getElementById('warrior-max-level-section');
  const actionBtn = document.getElementById('warrior-action-btn');

  if (isMaxLevel) {
    upgradeSection.style.display = 'none';
    maxLevelSection.style.display = 'block';
    actionBtn.style.display = 'none';
  } else {
    upgradeSection.style.display = 'block';
    maxLevelSection.style.display = 'none';

    // Next level
    const nextLevelData = getWarriorLevelData(type, level + 1);
    document.getElementById('warrior-next-level').textContent = level + 1;

    // Build cost display
    if (nextLevelData && nextLevelData.upgradeCost) {
      const costGrid = document.getElementById('warrior-cost-grid');
      let costHtml = '';

      for (const [resource, amount] of Object.entries(nextLevelData.upgradeCost)) {
        const hasEnough = (user[resource] || 0) >= amount;
        const resourceEmoji = getResourceEmoji(resource);
        const resourceName = getResourceName(resource);

        costHtml += `
          <div class="cost-item ${hasEnough ? 'sufficient' : 'insufficient'}">
            <span class="cost-item-icon">${resourceEmoji}</span>
            <span class="cost-item-value">${formatNumber(amount)}</span>
            <span class="cost-item-label">${resourceName}</span>
          </div>
        `;
      }

      costGrid.innerHTML = costHtml;

      // Update action button
      const canUpgrade = canAffordCost(user, nextLevelData.upgradeCost);
      actionBtn.textContent = 'Улучшить';
      actionBtn.style.display = 'block';
      actionBtn.disabled = !canUpgrade;
      actionBtn.className = canUpgrade ? 'btn btn-primary' : 'btn btn-primary disabled';
    }
  }

  // Show modal
  modal.style.display = 'flex';
}

/**
 * Close warrior modal
 */
export function closeWarriorModal() {
  const modal = document.getElementById('warrior-modal');
  modal.style.display = 'none';
  appState.selectedWarriorId = null;
}

/**
 * Get warrior count by type and level
 */
function getWarriorCountByLevel(type, level) {
  if (type === WARRIOR_TYPES.ATTACKER) {
    return appState.warriors.attackers.filter(w => w.level === level).length;
  } else {
    return appState.warriors.defenders.filter(w => w.level === level).length;
  }
}

/**
 * Get resource emoji
 */
function getResourceEmoji(resource) {
  const map = {
    jamcoin: '💰',
    wood: '🌲',
    stone: '🪨',
    meat: '🍖',
    jabcoin: '💎',
    gold: '🏆',
  };
  return map[resource] || resource;
}

/**
 * Get resource name in Russian
 */
function getResourceName(resource) {
  const map = {
    jamcoin: 'Jamcoin',
    wood: 'Дерево',
    stone: 'Камень',
    meat: 'Мясо',
    jabcoin: 'Jabcoin',
    gold: 'Золото',
  };
  return map[resource] || resource;
}

/**
 * Initialize global functions for HTML onclick handlers
 */
export function initializeWarriorsGlobalFunctions() {
  window.closeWarriorModal = closeWarriorModal;
  window.performWarriorAction = performWarriorAction;
}

/**
 * Perform warrior action (recruit, upgrade, etc.)
 */
async function performWarriorAction() {
  const actionBtn = document.getElementById('warrior-action-btn');
  if (actionBtn.disabled) return;

  const type = appState.selectedWarriorType;
  const level = parseInt(document.getElementById('warrior-modal-level').textContent);

  // TODO: Implement API call to perform action
  console.log('Performing action for', type, 'level', level);
}
