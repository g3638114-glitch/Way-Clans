import { appState } from '../utils/state.js';
import { 
  WARRIOR_TYPES, 
  DEFENDER_LEVELS, 
  ATTACKER_LEVELS, 
  HIRING_COSTS, 
  ATTACKER_PRODUCTION,
  getWarriorStats,
  getAttackerProduction 
} from '../game/warriors.js';
import { apiClient } from '../api/client.js';
import { formatNumberShort } from '../utils/formatters.js';

let currentWarriorType = null;
let currentWarriorLevel = 1;
let currentAction = 'hire'; // 'hire' or 'upgrade'

/**
 * Show warrior card modal for a specific warrior type
 * @param {string} warriorType - 'attacker' or 'defender'
 */
export async function showWarriorCard(warriorType) {
  currentWarriorType = warriorType;
  currentWarriorLevel = 1;
  currentAction = 'hire';

  const modal = document.getElementById('warrior-card-modal');
  const title = document.getElementById('warrior-card-title');
  const levelButtonsContainer = document.getElementById('warrior-level-buttons');

  // Set title
  const warriorInfo = WARRIOR_TYPES[warriorType];
  title.textContent = `${warriorInfo.emoji} ${warriorInfo.name}`;

  // Clear and create level buttons
  levelButtonsContainer.innerHTML = '';
  const levels = warriorType === 'attacker' ? ATTACKER_LEVELS : DEFENDER_LEVELS;
  
  for (let i = 1; i <= 6; i++) {
    const btn = document.createElement('button');
    btn.className = `level-btn ${i === 1 ? 'active' : ''}`;
    btn.textContent = `${i}`;
    btn.onclick = () => selectWarriorLevel(i);
    levelButtonsContainer.appendChild(btn);
  }

  // Load user's warriors and update the card
  await updateWarriorCard();

  // Show modal
  modal.style.display = 'block';
}

/**
 * Select a warrior level and update the card display
 * @param {number} level - Selected level (1-6)
 */
export async function selectWarriorLevel(level) {
  currentWarriorLevel = level;

  // Update active level button
  const levelBtns = document.querySelectorAll('.level-btn');
  levelBtns.forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === level);
  });

  // Update the card with new level stats
  await updateWarriorCard();
}

/**
 * Update warrior card display with current level stats
 */
export async function updateWarriorCard() {
  const warriorType = currentWarriorType;
  const level = currentWarriorLevel;

  // Get warrior stats
  const stats = getWarriorStats(warriorType, level);
  
  // Update basic stats
  document.getElementById('warrior-damage').textContent = stats.damage;
  document.getElementById('warrior-hp').textContent = stats.hp;

  // Show/hide production section (only for attackers)
  const productionSection = document.getElementById('warrior-production-section');
  if (warriorType === 'attacker') {
    productionSection.style.display = 'block';
    const production = getAttackerProduction(level);
    document.getElementById('warrior-prod-gold').textContent = production.gold;
    document.getElementById('warrior-prod-wood').textContent = production.wood;
    document.getElementById('warrior-prod-stone').textContent = production.stone;
    document.getElementById('warrior-prod-meat').textContent = production.meat;
  } else {
    productionSection.style.display = 'none';
  }

  // Show/hide upgrade or hire section
  const upgradeSection = document.getElementById('warrior-upgrade-section');
  const hireSection = document.getElementById('warrior-hire-section');
  
  if (level === 1) {
    // Level 1: Show hire costs
    hireSection.style.display = 'block';
    upgradeSection.style.display = 'none';
    updateHireCosts(warriorType);
    currentAction = 'hire';
    document.getElementById('warrior-action-btn').textContent = 'Нанять';
  } else {
    // Level 2-6: Show upgrade costs
    hireSection.style.display = 'none';
    upgradeSection.style.display = 'block';
    updateUpgradeCosts(warriorType, level);
    currentAction = 'upgrade';
    document.getElementById('warrior-action-btn').textContent = 'Улучшить';
  }

  // Load and display current warrior counts
  await loadWarriorCounts(warriorType);
}

/**
 * Update hire costs display
 * @param {string} warriorType - 'attacker' or 'defender'
 */
function updateHireCosts(warriorType) {
  const costs = HIRING_COSTS[warriorType];
  const costContainer = document.getElementById('warrior-hire-costs');
  
  costContainer.innerHTML = `
    <div class="hire-cost-item"><span>💰 Jamcoin:</span><span>${formatNumberShort(costs.gold)}</span></div>
    <div class="hire-cost-item"><span>🌲 Дерево:</span><span>${formatNumberShort(costs.wood)}</span></div>
    <div class="hire-cost-item"><span>🪨 Камень:</span><span>${formatNumberShort(costs.stone)}</span></div>
    <div class="hire-cost-item"><span>🍖 Мясо:</span><span>${formatNumberShort(costs.meat)}</span></div>
  `;
}

/**
 * Update upgrade costs display
 * @param {string} warriorType - 'attacker' or 'defender'
 * @param {number} level - Current level
 */
function updateUpgradeCosts(warriorType, level) {
  const levels = warriorType === 'attacker' ? ATTACKER_LEVELS : DEFENDER_LEVELS;
  const stats = levels[level];
  const costContainer = document.getElementById('warrior-upgrade-costs');
  
  if (!stats.upgradeCost) {
    costContainer.innerHTML = '<div class="upgrade-cost-item"><span>Максимальный уровень</span></div>';
    document.getElementById('warrior-action-btn').disabled = true;
    return;
  }

  document.getElementById('warrior-action-btn').disabled = false;
  
  let costHtml = '';
  if (stats.upgradeCost.gold) {
    costHtml += `<div class="upgrade-cost-item"><span>💰 Jamcoin:</span><span>${formatNumberShort(stats.upgradeCost.gold)}</span></div>`;
  }
  if (stats.upgradeCost.jabcoins) {
    costHtml += `<div class="upgrade-cost-item"><span>💎 Jabcoin:</span><span>${stats.upgradeCost.jabcoins}</span></div>`;
  }
  if (stats.upgradeCost.meat) {
    costHtml += `<div class="upgrade-cost-item"><span>🍖 Мясо:</span><span>${formatNumberShort(stats.upgradeCost.meat)}</span></div>`;
  }
  
  costContainer.innerHTML = costHtml;
}

/**
 * Load and display user's warrior counts
 * @param {string} warriorType - 'attacker' or 'defender'
 */
async function loadWarriorCounts(warriorType) {
  try {
    const response = await apiClient.getWarriorsByType(appState.userId, warriorType);
    const warriors = response.data;

    // Count warriors at each level
    const level = currentWarriorLevel;
    const count = warriors.filter(w => w.level === level).length;

    document.getElementById('warrior-current-count').textContent = count;
    document.getElementById('warrior-current-level').textContent = level;
  } catch (error) {
    console.error('Error loading warriors:', error);
    document.getElementById('warrior-current-count').textContent = '0';
    document.getElementById('warrior-current-level').textContent = currentWarriorLevel;
  }
}

/**
 * Show my warriors overview
 */
export async function showMyWarriors() {
  try {
    const response = await apiClient.getWarriors(appState.userId);
    const warriors = response.data;

    // Group warriors by type and level
    const groupedWarriors = {
      attacker: {},
      defender: {}
    };

    warriors.forEach(warrior => {
      if (!groupedWarriors[warrior.type][warrior.level]) {
        groupedWarriors[warrior.type][warrior.level] = 0;
      }
      groupedWarriors[warrior.type][warrior.level]++;
    });

    // Display warriors summary
    let summaryHtml = '<div style="padding: 15px; font-size: 14px;">';
    
    summaryHtml += '<h3>Атакующие:</h3>';
    let hasAttackers = false;
    for (let level = 1; level <= 6; level++) {
      const count = groupedWarriors.attacker[level] || 0;
      if (count > 0) {
        hasAttackers = true;
        summaryHtml += `<p>Уровень ${level}: ${count} воинов</p>`;
      }
    }
    if (!hasAttackers) {
      summaryHtml += '<p>Нет воинов</p>';
    }

    summaryHtml += '<h3>Защитники:</h3>';
    let hasDefenders = false;
    for (let level = 1; level <= 6; level++) {
      const count = groupedWarriors.defender[level] || 0;
      if (count > 0) {
        hasDefenders = true;
        summaryHtml += `<p>Уровень ${level}: ${count} воинов</p>`;
      }
    }
    if (!hasDefenders) {
      summaryHtml += '<p>Нет воинов</p>';
    }

    summaryHtml += '</div>';

    const container = document.getElementById('barracks-card-container');
    container.innerHTML = summaryHtml;
  } catch (error) {
    console.error('Error loading warriors:', error);
    const container = document.getElementById('barracks-card-container');
    container.innerHTML = '<p style="padding: 15px; color: #999;">Ошибка при загрузке воинов</p>';
  }
}

/**
 * Close warrior card modal
 */
export function closeWarriorCardModal() {
  document.getElementById('warrior-card-modal').style.display = 'none';
  document.getElementById('barracks-card-container').innerHTML = '';
}

/**
 * Perform warrior action (hire or upgrade)
 */
export async function performWarriorAction() {
  const warriorType = currentWarriorType;
  const level = currentWarriorLevel;

  if (currentAction === 'hire') {
    await hireWarrior(warriorType, level);
  } else if (currentAction === 'upgrade') {
    await upgradeWarrior(warriorType, level);
  }
}

/**
 * Hire a new warrior
 * @param {string} warriorType - 'attacker' or 'defender'
 * @param {number} level - Level to hire at (should be 1)
 */
async function hireWarrior(warriorType, level) {
  try {
    const btn = document.getElementById('warrior-action-btn');
    btn.disabled = true;
    btn.textContent = 'Загрузка...';

    const response = await apiClient.hireWarrior(appState.userId, {
      type: warriorType,
      level: level
    });

    if (response.success) {
      // Reload warrior counts and update UI
      await loadWarriorCounts(warriorType);
      await updateUserResources();

      // Show success message
      window.tg.showAlert(`Успешно нанято 1 ${WARRIOR_TYPES[warriorType].name.toLowerCase()} уровня 1!`);
    } else {
      window.tg.showAlert('Ошибка: ' + (response.error || 'Не удалось нанять воина'));
    }
  } catch (error) {
    console.error('Error hiring warrior:', error);
    window.tg.showAlert('Ошибка при найме воина: ' + error.message);
  } finally {
    const btn = document.getElementById('warrior-action-btn');
    btn.disabled = false;
    btn.textContent = 'Нанять';
  }
}

/**
 * Upgrade an existing warrior
 * @param {string} warriorType - 'attacker' or 'defender'
 * @param {number} level - Level to upgrade to
 */
async function upgradeWarrior(warriorType, level) {
  try {
    const btn = document.getElementById('warrior-action-btn');
    btn.disabled = true;
    btn.textContent = 'Загрузка...';

    const response = await apiClient.upgradeWarrior(appState.userId, {
      type: warriorType,
      fromLevel: level - 1,
      toLevel: level
    });

    if (response.success) {
      // Reload warrior counts and update UI
      await loadWarriorCounts(warriorType);
      await updateUserResources();

      // Show success message
      window.tg.showAlert(`Успешно улучшено ${response.data.upgradeCount || 1} воинов до уровня ${level}!`);
    } else {
      window.tg.showAlert('Ошибка: ' + (response.error || 'Не удалось улучшить воина'));
    }
  } catch (error) {
    console.error('Error upgrading warrior:', error);
    window.tg.showAlert('Ошибка при улучшении воина: ' + error.message);
  } finally {
    const btn = document.getElementById('warrior-action-btn');
    btn.disabled = false;
    btn.textContent = 'Улучшить';
  }
}

/**
 * Update user resources display
 */
async function updateUserResources() {
  try {
    const response = await apiClient.getUser(appState.userId);
    const user = response.data || response;

    appState.user = user;

    // Update resource values in header
    document.getElementById('gold-value').textContent = formatNumberShort(user.gold);
    document.getElementById('wood-value').textContent = formatNumberShort(user.wood);
    document.getElementById('stone-value').textContent = formatNumberShort(user.stone);
    document.getElementById('meat-value').textContent = formatNumberShort(user.meat);
    document.getElementById('jabcoins-value').textContent = user.jabcoins;
  } catch (error) {
    console.error('Error updating user resources:', error);
  }
}
