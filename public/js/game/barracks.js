import { appState, withOperationLock } from '../utils/state.js';
import { apiClient } from '../api/client.js';
import { updateUI } from '../ui/dom.js';
import { TROOP_STATS, HIRE_COSTS } from './config.js';
import { formatNumber } from '../utils/formatters.js';

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
          💰${stats.loot.gold} 🌲${stats.loot.wood} 🪨${stats.loot.stone} 🍖${stats.loot.meat}
        </span>
      </div>
    `;
  }

  let upgradeBtnHtml = '';
  if (level < 6) {
    const nextLevel = level + 1;
    const upgradeCost = TROOP_STATS[type][nextLevel].cost;
    let costText = '';
    if (upgradeCost.gold) costText += `💰${formatNumber(upgradeCost.gold)} `;
    if (upgradeCost.jabcoins) costText += `💎${upgradeCost.jabcoins} `;
    if (upgradeCost.meat) costText += `🍖${formatNumber(upgradeCost.meat)} `;

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
        <span class="cost-info-small">💰${hireCost.gold} 🌲${hireCost.wood} 🪨${hireCost.stone} 🍖${hireCost.meat}</span>
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

window.hireTroop = async (type) => {
  await withOperationLock('hireTroop', async () => {
    try {
      const result = await apiClient.hireTroop(appState.userId, type);
      appState.currentUser = result.user;
      appState.barracksData.troops = result.troops;
      updateUI(appState.currentUser);
      renderBarracks();
      tg.showAlert('✅ Воин успешно нанят!');
    } catch (error) {
      tg.showAlert(error.message);
    }
  });
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