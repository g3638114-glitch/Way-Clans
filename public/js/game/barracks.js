import { appState, withOperationLock } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { updateUI } from '../ui/dom.js';
import { TROOP_STATS, HIRE_COSTS } from './config.js';
import { formatNumber } from '../utils/formatters.js';
import { getResourceIconHtml } from '../utils/resourceIcons.js';

export async function loadBarracksData() {
  try {
    const data = await apiClient.getTroops(appState.userId);
    appState.barracksData = data;
    renderBarracks();
  } catch (error) {
    console.error('Error loading barracks:', error);
  }
}

export function renderBarracks() {
  const container = document.getElementById('barracks-container');
  if (!container) return;

  const type = appState.selectedBarracksTab || 'attacker';
  container.innerHTML = '';

  if (type === 'my-soldiers') {
    renderMySoldiers(container);
    return;
  }

  const level = type === 'attacker' ? appState.barracksData.attacker_level : appState.barracksData.defender_level;
  const stats = TROOP_STATS[type][level];
  const hireCost = HIRE_COSTS[type];
  
  const card = document.createElement('div');
  card.className = 'troop-card';
  
  let lootHtml = '';
  if (type === 'attacker') {
    lootHtml = `
      <div class="troop-stat-item" style="grid-column: span 2;">
          <span class="troop-stat-label">Добыча (за 1 воина):</span>
          <span class="troop-stat-value" style="font-size: 12px;">
          ${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${stats.loot.gold} ${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}${stats.loot.wood} ${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}${stats.loot.stone} ${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${stats.loot.meat}
        </span>
      </div>
    `;
  }

  let upgradeBtnHtml = '';
  if (level < 6) {
    const nextLevel = level + 1;
    const upgradeCost = TROOP_STATS[type][nextLevel].cost;
    let costText = '';
    if (upgradeCost.gold) costText += `${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${formatNumber(upgradeCost.gold)} `;
    if (upgradeCost.jabcoins) costText += `${getResourceIconHtml('jabcoin', 'resource-inline-icon', 'Jabcoin')}${upgradeCost.jabcoins} `;
    if (upgradeCost.meat) costText += `${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${formatNumber(upgradeCost.meat)} `;

    upgradeBtnHtml = `
      <button class="btn btn-upgrade-troop" onclick="window.upgradeTroopType('${type}')">
        Улучшить до ур. ${nextLevel}
        <span class="cost-info-small">${costText}</span>
      </button>
    `;
  } else {
    upgradeBtnHtml = `<button class="btn btn-maxed" disabled>Максимальный уровень</button>`;
  }

  card.innerHTML = `
    <div class="troop-header">
      <span class="troop-title">${type === 'attacker' ? '⚔️ Атакующий' : '🛡 Защищающий'}</span>
      <span class="troop-level-badge">Уровень ${level}</span>
    </div>
    <div class="troop-stats-grid">
      <div class="troop-stat-item">
        <span class="troop-stat-label">Урон</span>
        <span class="troop-stat-value">${formatNumber(stats.damage)}</span>
      </div>
      <div class="troop-stat-item">
        <span class="troop-stat-label">Здоровье</span>
        <span class="troop-stat-value">${formatNumber(stats.health)}</span>
      </div>
      ${lootHtml}
    </div>
    <div class="troop-actions">
      <button class="btn btn-hire" onclick="window.hireTroop('${type}')">
        Нанять (ур. ${level})
        <span class="cost-info-small">${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${hireCost.gold} ${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}${hireCost.wood} ${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}${hireCost.stone} ${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${hireCost.meat}</span>
      </button>
      ${upgradeBtnHtml}
    </div>
  `;
  
  container.appendChild(card);
}

function renderMySoldiers(container) {
  const list = document.createElement('div');
  list.className = 'my-soldiers-list';
  
  const troops = appState.barracksData.troops;
  
  if (troops.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">У вас пока нет воинов</p>';
  } else {
    // Group by type
    const attackers = troops.filter(t => t.troop_type === 'attacker').sort((a, b) => a.level - b.level);
    const defenders = troops.filter(t => t.troop_type === 'defender').sort((a, b) => a.level - b.level);
    
    if (attackers.length > 0) {
      list.innerHTML += '<h3 style="margin: 10px 0; color: #ff6b6b;">⚔️ Атакующие</h3>';
      attackers.forEach(t => {
        list.innerHTML += `
          <div class="soldier-item">
            <div class="soldier-info-main">
              <span class="soldier-name">Воин ур. ${t.level}</span>
            </div>
            <span class="soldier-count">${t.count}</span>
          </div>
        `;
      });
    }
    
    if (defenders.length > 0) {
      list.innerHTML += '<h3 style="margin: 20px 0 10px; color: #4c6fa6;">🛡 Защищающие</h3>';
      defenders.forEach(t => {
        list.innerHTML += `
          <div class="soldier-item" style="border-left-color: #4c6fa6;">
            <div class="soldier-info-main">
              <span class="soldier-name">Защитник ур. ${t.level}</span>
            </div>
            <span class="soldier-count">${t.count}</span>
          </div>
        `;
      });
    }
  }
  
  container.appendChild(list);
}

// Store the current hiring context
let currentHiringContext = {
  type: null,
  level: null,
  cost: null,
  maxPossible: 0
};

window.openHireTroopsModal = (type) => {
  const level = type === 'attacker' ? appState.barracksData.attacker_level : appState.barracksData.defender_level;
  const hireCost = HIRE_COSTS[type];

  currentHiringContext = { type, level, cost: hireCost, maxPossible: 0 };

  // Calculate max possible troops to hire
  const goldPossible = Math.floor(appState.currentUser.gold / hireCost.gold);
  const woodPossible = Math.floor(appState.currentUser.wood / hireCost.wood);
  const stonePossible = Math.floor(appState.currentUser.stone / hireCost.stone);
  const meatPossible = Math.floor(appState.currentUser.meat / hireCost.meat);

  currentHiringContext.maxPossible = Math.min(goldPossible, woodPossible, stonePossible, meatPossible, 1000);

  // Set modal title
  document.getElementById('hire-troops-title').textContent =
    type === 'attacker' ? '⚔️ Нанять атакующих' : '🛡 Нанять защищающих';

  // Display troop info
  const stats = TROOP_STATS[type][level];
  let infoHtml = `
    <div class="troop-hire-info">
      <div class="troop-type-header">${type === 'attacker' ? '⚔️ Атакующий' : '🛡 Защищающий'} (ур. ${level})</div>
      <div class="troop-hire-stats">
        <div class="stat-line"><span class="stat-name">Урон:</span><span class="stat-value">${formatNumber(stats.damage)}</span></div>
        <div class="stat-line"><span class="stat-name">Здоровье:</span><span class="stat-value">${formatNumber(stats.health)}</span></div>
  `;

  if (type === 'attacker') {
    infoHtml += `
        <div class="stat-line"><span class="stat-name">Добыча за 1:</span><span class="stat-value">${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${stats.loot.gold} ${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}${stats.loot.wood} ${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}${stats.loot.stone} ${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${stats.loot.meat}</span></div>
    `;
  }

  infoHtml += `
      </div>
      <div class="cost-per-unit">
        <p class="cost-label">Стоимость за 1 воина:</p>
        <div class="cost-display">${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${hireCost.gold} ${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}${hireCost.wood} ${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}${hireCost.stone} ${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${hireCost.meat}</div>
      </div>
      <div class="available-resources">
        <p class="available-label">Доступно воинов: <strong>${currentHiringContext.maxPossible}</strong></p>
      </div>
    </div>
  `;

  document.getElementById('hire-troops-info').innerHTML = infoHtml;

  // Set initial quantity
  document.getElementById('hire-troops-quantity').value = '1';
  document.getElementById('hire-troops-quantity').max = currentHiringContext.maxPossible;

  // Update cost display
  window.updateHireTroopsCost();

  // Show modal
  document.getElementById('hire-troops-modal').classList.add('active');
};

window.closeHireTroopsModal = () => {
  document.getElementById('hire-troops-modal').classList.remove('active');
  currentHiringContext = { type: null, level: null, cost: null, maxPossible: 0 };
};

window.updateHireTroopsCost = () => {
  const quantity = parseInt(document.getElementById('hire-troops-quantity').value) || 1;
  const cost = currentHiringContext.cost;

  const totalCost = {
    gold: cost.gold * quantity,
    wood: cost.wood * quantity,
    stone: cost.stone * quantity,
    meat: cost.meat * quantity
  };

  const costDisplay = document.getElementById('hire-troops-cost-display');
  costDisplay.innerHTML = `
    <div class="cost-items-row">
      <div class="cost-item">${getResourceIconHtml('gold', 'resource-inline-icon', 'Jamcoin')}${formatNumber(totalCost.gold)}</div>
      <div class="cost-item">${getResourceIconHtml('wood', 'resource-inline-icon', 'Дерево')}${formatNumber(totalCost.wood)}</div>
      <div class="cost-item">${getResourceIconHtml('stone', 'resource-inline-icon', 'Камень')}${formatNumber(totalCost.stone)}</div>
      <div class="cost-item">${getResourceIconHtml('meat', 'resource-inline-icon', 'Мясо')}${formatNumber(totalCost.meat)}</div>
    </div>
  `;
};

window.setMaxHireTroopsQuantity = () => {
  document.getElementById('hire-troops-quantity').value = currentHiringContext.maxPossible;
  window.updateHireTroopsCost();
};

window.confirmHireTroops = async () => {
  const quantity = parseInt(document.getElementById('hire-troops-quantity').value) || 1;

  if (currentHiringContext.maxPossible <= 0) {
    tg.showAlert('❌ Недостаточно ресурсов для найма воинов');
    return;
  }

  if (quantity <= 0) {
    tg.showAlert('❌ Введите корректное количество воинов');
    return;
  }

  if (quantity > currentHiringContext.maxPossible) {
    tg.showAlert(`❌ Недостаточно ресурсов для найма. Сейчас можно нанять максимум ${currentHiringContext.maxPossible} воин(ов).`);
    return;
  }

  await withOperationLock('hireTroop', async () => {
    try {
      const result = await apiClient.hireTroop(appState.userId, currentHiringContext.type, quantity);
      appState.currentUser = result.user;
      appState.barracksData.troops = result.troops;
      updateUI(appState.currentUser);
      renderBarracks();
      window.closeHireTroopsModal();
      tg.showAlert(`✅ ${quantity} воин(ов) успешно нанят(ы)!`);
    } catch (error) {
      tg.showAlert(error.message);
    }
  });
};

// Keep the old hireTroop for backwards compatibility (just opens the modal with quantity 1)
window.hireTroop = (type) => {
  window.openHireTroopsModal(type);
};

window.upgradeTroopType = async (type) => {
  await withOperationLock('upgradeTroop', async () => {
    try {
      const result = await apiClient.upgradeTroopType(appState.userId, type);
      appState.currentUser = result.user;
      appState.barracksData.attacker_level = result.user.attacker_level;
      appState.barracksData.defender_level = result.user.defender_level;
      updateUI(appState.currentUser);
      renderBarracks();
      tg.showAlert('✅ Уровень воинов повышен!');
    } catch (error) {
      tg.showAlert(error.message);
    }
  });
};
