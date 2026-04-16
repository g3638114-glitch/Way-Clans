import { appState } from '../../utils/state.js';
import { apiClient } from '../../api/client.js';
import { updateUI } from '../dom.js';
import { WARRIOR_TYPES, HIRE_COSTS, ATTACKER_STATS, DEFENDER_STATS } from '../../game/warriorsConfig.js';
import { formatNumber } from '../../utils/formatters.js';

let currentBarracksTab = 'attacker';

export async function renderBarracks() {
  const container = document.getElementById('barracks-container');
  if (!container) return;

  try {
    const data = await apiClient.getBarracks(appState.userId);
    const user = data.user;
    const warriors = data.warriors;

    container.innerHTML = '';

    if (currentBarracksTab === 'attacker') {
      container.appendChild(createWarriorCard(WARRIOR_TYPES.ATTACKER, user.attacker_level));
    } else if (currentBarracksTab === 'defender') {
      container.appendChild(createWarriorCard(WARRIOR_TYPES.DEFENDER, user.defender_level));
    } else {
      container.appendChild(createMyArmyView(warriors));
    }
  } catch (e) {
    container.innerHTML = `<p style="color:red; text-align:center;">Ошибка: ${e.message}</p>`;
  }
}

function createWarriorCard(type, level) {
  const stats = type === WARRIOR_TYPES.ATTACKER ? ATTACKER_STATS[level] : DEFENDER_STATS[level];
  const nextStats = type === WARRIOR_TYPES.ATTACKER ? ATTACKER_STATS[level + 1] : DEFENDER_STATS[level + 1];
  const hireCost = HIRE_COSTS[type];
  
  const card = document.createElement('div');
  card.className = 'warrior-card';
  
  const name = type === WARRIOR_TYPES.ATTACKER ? 'Атакующий воин' : 'Защитник';
  const icon = type === WARRIOR_TYPES.ATTACKER ? '⚔️' : '🛡️';

  let prodHtml = '';
  if (type === WARRIOR_TYPES.ATTACKER && stats.prod) {
    prodHtml = `
      <div class="warrior-prod-info">
        <span class="prod-title">Добыча (в час на 1 воина):</span>
        <div class="prod-grid">
          <div class="prod-item"><span>💰 Jamcoin:</span> <span>${stats.prod.gold}</span></div>
          <div class="prod-item"><span>🌲 Дерево:</span> <span>${stats.prod.wood}</span></div>
          <div class="prod-item"><span>🪨 Камень:</span> <span>${stats.prod.stone}</span></div>
          <div class="prod-item"><span>🍖 Мясо:</span> <span>${stats.prod.meat}</span></div>
        </div>
      </div>
    `;
  }

  let upgradeHtml = '';
  if (nextStats && nextStats.upgrade) {
    const cost = nextStats.upgrade;
    let costStr = [];
    if (cost.gold) costStr.push(`${formatNumber(cost.gold)} 💰`);
    if (cost.meat) costStr.push(`${formatNumber(cost.meat)} 🍖`);
    if (cost.jabcoins) costStr.push(`${cost.jabcoins} 💎`);
    
    upgradeHtml = `
      <button class="btn btn-upgrade-warrior" onclick="window.upgradeWarriorType('${type}')">
        Улучшить до ${level + 1} ур. (${costStr.join(', ')})
      </button>
    `;
  } else {
    upgradeHtml = `<button class="btn btn-maxed" disabled>Максимальный уровень</button>`;
  }

  card.innerHTML = `
    <div class="warrior-header">
      <div class="warrior-icon-large">${icon}</div>
      <div class="warrior-title-group">
        <h2>${name}</h2>
        <span class="warrior-level-badge">Уровень ${level}</span>
      </div>
    </div>

    <div class="warrior-stats-grid">
      <div class="warrior-stat-box">
        <span class="stat-box-label">Урон</span>
        <span class="stat-box-value">${stats.damage}</span>
      </div>
      <div class="warrior-stat-box">
        <span class="stat-box-label">Здоровье</span>
        <span class="stat-box-value">${stats.health}</span>
      </div>
    </div>

    ${prodHtml}

    <div class="warrior-actions">
      <div class="prod-title">Стоимость найма (1 ед.):</div>
      <div class="prod-grid" style="margin-bottom:10px;">
        <div class="prod-item"><span>💰: ${hireCost.gold}</span></div>
        <div class="prod-item"><span>🌲: ${hireCost.wood}</span></div>
        <div class="prod-item"><span>🪨: ${hireCost.stone}</span></div>
        <div class="prod-item"><span>🍖: ${hireCost.meat}</span></div>
      </div>
      
      <div class="hire-control">
        <input type="number" id="hire-qty" class="hire-input" placeholder="Кол-во" min="1" value="1">
        <button class="btn btn-hire" onclick="window.hireWarriors('${type}')">Нанять</button>
      </div>

      ${upgradeHtml}
    </div>
  `;

  return card;
}

function createMyArmyView(warriors) {
  const view = document.createElement('div');
  view.className = 'my-warriors-list';

  if (warriors.length === 0) {
    view.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">У вас пока нет воинов</p>';
    return view;
  }

  warriors.sort((a, b) => b.level - a.level).forEach(w => {
    const icon = w.warrior_type === WARRIOR_TYPES.ATTACKER ? '⚔️' : '🛡️';
    const name = w.warrior_type === WARRIOR_TYPES.ATTACKER ? 'Атакующий' : 'Защитник';
    
    const item = document.createElement('div');
    item.className = 'army-group';
    item.innerHTML = `
      <div class="army-info">
        <span style="font-size:24px;">${icon}</span>
        <div>
          <div style="font-weight:bold;">${name} (ур. ${w.level})</div>
          <div style="font-size:12px; color:#aaa;">${w.warrior_type === WARRIOR_TYPES.ATTACKER ? 'Добывает ресурсы' : 'Защищает базу'}</div>
        </div>
      </div>
      <div class="army-qty">x${w.quantity}</div>
    `;
    view.appendChild(item);
  });

  const hasAttackers = warriors.some(w => w.warrior_type === WARRIOR_TYPES.ATTACKER);
  if (hasAttackers) {
    const collectBtn = document.createElement('button');
    collectBtn.className = 'btn btn-collect-army';
    collectBtn.textContent = 'Собрать добычу армии';
    collectBtn.onclick = () => window.collectArmyResources();
    view.appendChild(collectBtn);
  }

  return view;
}

export function setBarracksTab(tab) {
  currentBarracksTab = tab;
  renderBarracks();
}

window.hireWarriors = async (type) => {
  const qty = parseInt(document.getElementById('hire-qty').value);
  if (!qty || qty <= 0) return;
  
  try {
    const data = await apiClient.hireWarriors(appState.userId, type, qty);
    appState.currentUser = data.user;
    updateUI(appState.currentUser);
    renderBarracks();
    tg.showAlert(`✅ Нанято ${qty} воинов!`);
  } catch (e) {
    tg.showAlert(e.message);
  }
};

window.upgradeWarriorType = async (type) => {
  try {
    const data = await apiClient.upgradeWarriorType(appState.userId, type);
    appState.currentUser = data.user;
    updateUI(appState.currentUser);
    renderBarracks();
    tg.showAlert(`✅ Уровень воинов повышен!`);
  } catch (e) {
    tg.showAlert(e.message);
  }
};

window.collectArmyResources = async () => {
  try {
    const data = await apiClient.collectArmyResources(appState.userId);
    appState.currentUser = data.user;
    updateUI(appState.currentUser);
    tg.showAlert(`✅ Собрано: ${data.collected.gold}💰, ${data.collected.wood}🌲, ${data.collected.stone}🪨, ${data.collected.meat}🍖`);
  } catch (e) {
    tg.showAlert(e.message);
  }
};